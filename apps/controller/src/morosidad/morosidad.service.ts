import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ActualizarConfiguracionDto,
  ConfiguracionMorosidadDto,
  ContratosVencidosQueryDto,
  ContratosVencidosResponseDto,
  DetalleContratoVencidoDto,
  FacturaDetalleDto,
  PagoDetalleDto,
  ResultadoRevisionDto,
} from './dto/morosidad.dto.js';

/**
 * Estados de `factura` que cuentan como deuda pendiente de pago. Se define una sola vez
 * porque los cuatro CU del bloque (47, 55, 56 y el saldo de 80) tienen que coincidir: si
 * mañana se agrega un estado, no puede quedar uno de ellos con un criterio distinto.
 */
const ESTADOS_IMPAGOS = ['pendiente', 'vencida'];

/**
 * Techo de `ids_marcados` en el resultado de CU-47. El conteo total va aparte, en
 * `contratos_marcados`: la lista es para que el administrador revise una muestra, no para
 * transportar miles de enteros en la respuesta y en la bitácora.
 */
const MAX_IDS_EN_RESULTADO = 100;

/** Rango válido de `contrato.dia_vencimiento`, fijado por CU-54. */
const DIA_VENCIMIENTO_VALIDO = { gte: 1, lte: 28 };

/** Forma de la fila de configuración tal como llega de Prisma (Decimal sin serializar). */
type ConfiguracionRaw = {
  dias_gracia: number;
  umbral_suspension: { toString(): string };
  fecha_actualizacion: Date | null;
};

@Injectable()
export class MorosidadService {
  private readonly logger = new Logger(MorosidadService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-80: valores actuales de los parámetros de detección de morosidad.
   *
   * Se resuelve con `findFirst` porque todavía no existe sesión de administrador que
   * indique a qué empresa pertenece. Cuando el panel la aporte, esto pasa a
   * `findUnique({ where: { id_empresa } })`.
   */
  async obtenerConfiguracion(): Promise<ConfiguracionMorosidadDto> {
    try {
      const config = await this.prisma.configuracion_morosidad.findFirst({
        orderBy: { id_configuracion: 'asc' },
      });

      if (!config) {
        throw new NotFoundException(
          'No hay parámetros de morosidad registrados. Falta cargar la fila inicial de configuracion_morosidad.',
        );
      }

      return this.construirConfiguracion(config);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Los parámetros de morosidad no están disponibles temporalmente.',
      );
    }
  }

  /**
   * CU-80: actualiza los parámetros y registra el cambio en la bitácora.
   *
   * Los rangos (Excepción 2) los valida el ZodValidationPipe en el controller, así que acá
   * los valores ya llegan dentro de rango.
   */
  async actualizarConfiguracion(
    dto: ActualizarConfiguracionDto,
  ): Promise<ConfiguracionMorosidadDto> {
    try {
      const actual = await this.prisma.configuracion_morosidad.findFirst({
        orderBy: { id_configuracion: 'asc' },
      });

      if (!actual) {
        throw new NotFoundException(
          'No hay parámetros de morosidad registrados. Falta cargar la fila inicial de configuracion_morosidad.',
        );
      }

      const actualizado = await this.prisma.configuracion_morosidad.update({
        where: { id_configuracion: actual.id_configuracion },
        data: {
          dias_gracia: dto.dias_gracia,
          umbral_suspension: dto.umbral_suspension,
          fecha_actualizacion: new Date(),
        },
      });

      // CU-80 poscondición: el cambio queda registrado en la bitácora con marca de tiempo.
      // La marca de tiempo la pone log_auditoria.fecha_hora. `id_usuario` queda null hasta
      // que exista sesión de admin.
      // En su propio try/catch: si falla la auditoría no se rompe la respuesta, porque los
      // parámetros ya quedaron guardados.
      try {
        await this.prisma.log_auditoria.create({
          data: {
            accion: 'ACTUALIZAR_CONFIG_MOROSIDAD',
            entidad_afectada: 'configuracion_morosidad',
            id_entidad_afectada: actual.id_configuracion,
            valor_anterior: {
              dias_gracia: actual.dias_gracia,
              umbral_suspension: Number(actual.umbral_suspension),
            },
            valor_nuevo: {
              dias_gracia: actualizado.dias_gracia,
              umbral_suspension: Number(actualizado.umbral_suspension),
            },
          },
        });
      } catch (auditError) {
        this.logger.error(
          `No se pudo registrar auditoría de configuracion_morosidad=${actual.id_configuracion}`,
          auditError,
        );
      }

      this.logger.log(
        `Parámetros de morosidad actualizados — dias_gracia: ${actual.dias_gracia} → ${actualizado.dias_gracia}, ` +
          `umbral_suspension: ${Number(actual.umbral_suspension)} → ${Number(actualizado.umbral_suspension)}`,
      );

      return this.construirConfiguracion(actualizado);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'No fue posible actualizar los parámetros de morosidad.',
      );
    }
  }

  /**
   * CU-47 / RF-35: revisión diaria de morosidad, todos los días a las 00:00.
   *
   * "identificar contratos cuya deuda supere la fecha de vencimiento más los días de gracia
   * configurados y marcarlos como morosos" (RF-35).
   *
   * El cron la invoca sin argumentos; también se puede disparar a mano desde el endpoint
   * `POST /admin/morosidad/revision` para poder demostrarla sin esperar a medianoche.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'revision-morosidad',
    // La política de cobranza es horaria local: a las 00:00 de Chile, no de UTC.
    timeZone: 'America/Santiago',
  })
  async revisarMorosidad(): Promise<ResultadoRevisionDto> {
    const inicio = new Date();
    this.logger.log('Revisión de morosidad iniciada');

    // CU-47 Excepción 1: el proceso no puede iniciarse. Sin parámetros configurados no hay
    // días de gracia con los que comparar, así que se deja registro y no se marca nada.
    let diasGracia: number;
    try {
      diasGracia = (await this.obtenerConfiguracion()).dias_gracia;
    } catch (error) {
      this.logger.error(
        'Revisión de morosidad no pudo iniciarse: no hay parámetros configurados',
        error,
      );
      return this.registrarResultado({
        inicio,
        fin: new Date(),
        procesados: 0,
        marcados: [],
        omitidos: 0,
        fallo: 'SIN_CONFIGURACION',
      });
    }

    const hoy = this.hoy();

    // `fecha_limite_pago + dias_gracia < hoy` es equivalente a
    // `fecha_limite_pago < hoy - dias_gracia`. Como `dias_gracia` ya se conoce, la fecha de
    // corte se calcula acá y la comparación la hace la base: así no se traen a memoria todas
    // las facturas impagas del sistema para descartarlas en JavaScript.
    const corte = new Date(hoy);
    corte.setUTCDate(corte.getUTCDate() - diasGracia);

    const conDeudaPendiente = { estado: { in: ESTADOS_IMPAGOS } };
    const pasadaLaGracia = {
      ...conDeudaPendiente,
      fecha_limite_pago: { lt: corte },
    };

    let procesados: number;
    let omitidos: number;
    let aMarcar: { id_contrato: number }[];
    try {
      [procesados, omitidos, aMarcar] = await Promise.all([
        // "el sistema consulta todos los contratos con deuda pendiente"
        this.prisma.contrato.count({
          where: { factura: { some: conDeudaPendiente } },
        }),
        // CU-47 Excepción 2: los que superan la gracia pero no tienen día de vencimiento
        // válido se omiten y se registra la inconsistencia.
        this.prisma.contrato.count({
          where: {
            factura: { some: pasadaLaGracia },
            NOT: { dia_vencimiento: DIA_VENCIMIENTO_VALIDO },
          },
        }),
        // Los que se marcan. `fecha_morosidad: null` excluye los ya marcados en corridas
        // anteriores, para conservar la fecha original desde la que están morosos.
        this.prisma.contrato.findMany({
          where: {
            factura: { some: pasadaLaGracia },
            dia_vencimiento: DIA_VENCIMIENTO_VALIDO,
            fecha_morosidad: null,
          },
          select: { id_contrato: true },
        }),
      ]);
    } catch (error) {
      // CU-47 Excepción 3: la consulta masiva falla, el proceso queda inconcluso.
      this.logger.error(
        'Revisión de morosidad inconclusa: falló la consulta masiva de contratos',
        error,
      );
      return this.registrarResultado({
        inicio,
        fin: new Date(),
        procesados: 0,
        marcados: [],
        omitidos: 0,
        fallo: 'CONSULTA_FALLIDA',
      });
    }

    if (omitidos > 0) {
      this.logger.warn(
        `${omitidos} contrato(s) omitidos por dia_vencimiento fuera del rango 1–28`,
      );
    }

    const ids = aMarcar.map((c) => c.id_contrato);

    if (ids.length > 0) {
      try {
        await this.prisma.contrato.updateMany({
          where: { id_contrato: { in: ids }, fecha_morosidad: null },
          data: { fecha_morosidad: hoy },
        });
      } catch (error) {
        this.logger.error(
          'Revisión de morosidad inconclusa: falló el marcado de contratos',
          error,
        );
        return this.registrarResultado({
          inicio,
          fin: new Date(),
          procesados,
          marcados: [],
          omitidos,
          fallo: 'MARCADO_FALLIDO',
        });
      }
    }

    return this.registrarResultado({
      inicio,
      fin: new Date(),
      procesados,
      marcados: ids,
      omitidos,
    });
  }

  /**
   * CU-47: deja el log con hora de inicio, fin y cantidad de contratos procesados, y lo
   * persiste en `log_auditoria` para que el administrador pueda revisar el detalle.
   *
   * En su propio try/catch: si falla la auditoría, los contratos ya quedaron marcados y el
   * resultado igual se devuelve.
   */
  private async registrarResultado(datos: {
    inicio: Date;
    fin: Date;
    procesados: number;
    marcados: number[];
    omitidos: number;
    fallo?: string;
  }): Promise<ResultadoRevisionDto> {
    // `contratos_marcados` lleva el total real; `ids_marcados` solo una muestra. En la
    // primera corrida sobre datos históricos pueden marcarse miles de contratos a la vez, y
    // sin techo esa lista viajaría entera en la respuesta HTTP y quedaría guardada completa
    // dentro del JSON de `log_auditoria`.
    const ids_marcados = datos.marcados.slice(0, MAX_IDS_EN_RESULTADO);

    const resultado: ResultadoRevisionDto = {
      inicio: datos.inicio.toISOString(),
      fin: datos.fin.toISOString(),
      contratos_procesados: datos.procesados,
      contratos_marcados: datos.marcados.length,
      contratos_omitidos: datos.omitidos,
      ids_marcados,
      ids_truncados: datos.marcados.length > ids_marcados.length,
    };

    try {
      await this.prisma.log_auditoria.create({
        data: {
          accion: datos.fallo
            ? 'REVISION_MOROSIDAD_FALLIDA'
            : 'REVISION_MOROSIDAD',
          entidad_afectada: 'contrato',
          valor_nuevo: datos.fallo
            ? { ...resultado, fallo: datos.fallo }
            : resultado,
        },
      });
    } catch (auditError) {
      this.logger.error(
        'No se pudo registrar auditoría de la revisión de morosidad',
        auditError,
      );
    }

    this.logger.log(
      `Revisión de morosidad finalizada — procesados: ${resultado.contratos_procesados}, ` +
        `marcados: ${resultado.contratos_marcados}, omitidos: ${resultado.contratos_omitidos}` +
        (datos.fallo ? ` (fallo: ${datos.fallo})` : ''),
    );

    return resultado;
  }

  /**
   * CU-55 / RF-40: lista paginada de contratos con saldos vencidos pendientes de pago.
   *
   * "una lista actualizada al momento de entrar o recargar la página" (RF-40): la consulta
   * corre en cada request, sin caché.
   *
   * El saldo y el conteo los calcula la base con `groupBy`, no se traen las facturas una por
   * una: un contrato con 8 meses impagos aporta una fila, no ocho.
   */
  async listarContratosVencidos(
    query: ContratosVencidosQueryDto,
  ): Promise<ContratosVencidosResponseDto> {
    const hoy = this.hoy();
    const facturaVencida = {
      estado: { in: ESTADOS_IMPAGOS },
      fecha_limite_pago: { lt: hoy },
      // `factura.id_contrato` es nullable: sin este filtro, `groupBy` devuelve un grupo con
      // id nulo que ocupa un lugar de la página y después se descarta, dejando la página
      // con menos filas que `limit` y descuadrada respecto de `total`.
      id_contrato: { not: null },
    };

    try {
      const [grupos, total] = await Promise.all([
        this.prisma.factura.groupBy({
          by: ['id_contrato'],
          where: facturaVencida,
          _sum: { monto: true },
          _count: { _all: true },
          _min: { fecha_limite_pago: true },
          orderBy: { id_contrato: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.contrato.count({
          where: { factura: { some: facturaVencida } },
        }),
      ]);

      // `factura.id_contrato` es nullable en el schema; una factura huérfana no es un
      // contrato vencido.
      const conContrato = grupos.filter(
        (g): g is typeof g & { id_contrato: number } => g.id_contrato !== null,
      );

      // CU-55 Excepción 3: sin contratos vencidos se devuelve la lista vacía, no un error.
      if (conContrato.length === 0) {
        return { data: [], total, page: query.page, limit: query.limit };
      }

      const contratos = await this.prisma.contrato.findMany({
        where: {
          id_contrato: { in: conContrato.map((g) => g.id_contrato) },
        },
        select: {
          id_contrato: true,
          cliente: { select: { rut: true, nombre_completo: true } },
        },
      });
      const clientePorContrato = new Map(
        contratos.map((c) => [c.id_contrato, c.cliente]),
      );

      return {
        data: conContrato.map((grupo) => {
          const cliente = clientePorContrato.get(grupo.id_contrato);
          return {
            id_contrato: grupo.id_contrato,
            rut: cliente?.rut ?? null,
            nombre_completo: cliente?.nombre_completo ?? null,
            saldo_vencido: Number(grupo._sum.monto ?? 0),
            facturas_vencidas: grupo._count._all,
            dias_vencido: grupo._min.fecha_limite_pago
              ? this.diasEntre(grupo._min.fecha_limite_pago, hoy)
              : 0,
          };
        }),
        total,
        page: query.page,
        limit: query.limit,
      };
    } catch (error) {
      // CU-55 Excepción 2: la consulta falla por falla en el sistema.
      this.logger.error('No se pudo listar los contratos vencidos', error);
      throw new InternalServerErrorException(
        'La lista de contratos vencidos no pudo actualizarse.',
      );
    }
  }

  /**
   * CU-56 / RF-40: "el detalle del contrato con la información de deuda, historial de pagos
   * y datos del cliente".
   *
   * No reutiliza `DeudaPublicaService.construirRespuesta` porque esa arma la vista pública,
   * que no incluye historial de pagos ni datos de contacto — justo lo que este CU necesita.
   */
  async obtenerDetalleContratoVencido(
    idContrato: number,
  ): Promise<DetalleContratoVencidoDto> {
    const hoy = this.hoy();

    try {
      const contrato = await this.prisma.contrato.findUnique({
        where: { id_contrato: idContrato },
        select: {
          id_contrato: true,
          estado: true,
          dia_vencimiento: true,
          plan: { select: { nombre_comercial: true } },
          cliente: {
            select: {
              rut: true,
              nombre_completo: true,
              email: true,
              telefono: true,
            },
          },
          factura: {
            orderBy: { fecha_limite_pago: 'desc' },
            select: {
              id_factura: true,
              periodo_mes: true,
              periodo_anio: true,
              monto: true,
              fecha_limite_pago: true,
              estado: true,
              pago: {
                orderBy: { fecha_pago: 'desc' },
                select: {
                  id_pago: true,
                  monto: true,
                  fecha_pago: true,
                  pasarela: true,
                },
              },
            },
          },
        },
      });

      if (!contrato) {
        throw new NotFoundException(
          `No existe un contrato con id ${idContrato}.`,
        );
      }

      // Una sola pasada sobre las facturas: antes eran tres (saldo, detalle e historial),
      // y cada una volvía a normalizar `fecha_limite_pago` a medianoche por su cuenta.
      const facturas: FacturaDetalleDto[] = [];
      const historialPagos: PagoDetalleDto[] = [];
      let saldoVencido = 0;

      for (const f of contrato.factura) {
        const limite = this.inicioDelDia(f.fecha_limite_pago);
        const monto = Number(f.monto ?? 0);
        const vencida = limite < hoy && ESTADOS_IMPAGOS.includes(f.estado);

        if (vencida) saldoVencido += monto;

        facturas.push({
          id_factura: f.id_factura,
          periodo: `${String(f.periodo_mes).padStart(2, '0')}/${f.periodo_anio}`,
          monto,
          fecha_limite_pago: this.soloFecha(f.fecha_limite_pago),
          estado: f.estado,
          dias_vencida: vencida ? this.diasEntre(limite, hoy) : null,
        });

        for (const p of f.pago) {
          historialPagos.push({
            id_pago: p.id_pago,
            monto: Number(p.monto),
            fecha_pago: p.fecha_pago.toISOString(),
            pasarela: p.pasarela,
          });
        }
      }

      return {
        id_contrato: contrato.id_contrato,
        estado: contrato.estado,
        dia_vencimiento: contrato.dia_vencimiento,
        plan: contrato.plan?.nombre_comercial ?? null,
        cliente: contrato.cliente,
        saldo_vencido: saldoVencido,
        facturas,
        historial_pagos: historialPagos,
      };
    } catch (error) {
      // CU-56 Excepción 2: el detalle no puede cargarse por error del sistema.
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `No se pudo cargar el detalle del contrato ${idContrato}`,
        error,
      );
      throw new InternalServerErrorException(
        'La información del contrato no está disponible temporalmente.',
      );
    }
  }

  /** Fecha en formato ISO sin hora (`YYYY-MM-DD`). */
  private soloFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  /** Días completos entre dos fechas. */
  private diasEntre(desde: Date, hasta: Date): number {
    return Math.floor(
      (this.inicioDelDia(hasta).getTime() -
        this.inicioDelDia(desde).getTime()) /
        86_400_000,
    );
  }

  /**
   * Normaliza una fecha a medianoche **UTC**, conservando su día de calendario.
   *
   * Prisma devuelve las columnas `@db.Date` (`fecha_limite_pago`, `fecha_morosidad`) como
   * medianoche UTC. Normalizar con `setHours(0,0,0,0)` —medianoche local— retrocedería un
   * día en cualquier zona al oeste de Greenwich: en Chile (UTC-4) una factura del 20 pasaba
   * a tratarse como del 19, y CU-47 marcaba los contratos un día antes de lo debido.
   */
  private inicioDelDia(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  /**
   * El día de hoy según el calendario **local** del servidor, expresado como medianoche UTC
   * para poder compararlo con las columnas DATE.
   *
   * La política de cobranza es horaria local: a las 00:00 de Chile empieza un día nuevo,
   * aunque en UTC todavía sean las 04:00 del día anterior.
   */
  private hoy(): Date {
    const ahora = new Date();
    return new Date(
      Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
    );
  }

  /** `umbral_suspension` es Decimal en Prisma; se serializa como número para el JSON. */
  private construirConfiguracion(
    config: ConfiguracionRaw,
  ): ConfiguracionMorosidadDto {
    return {
      dias_gracia: config.dias_gracia,
      umbral_suspension: Number(config.umbral_suspension.toString()),
      fecha_actualizacion: config.fecha_actualizacion?.toISOString() ?? null,
    };
  }
}
