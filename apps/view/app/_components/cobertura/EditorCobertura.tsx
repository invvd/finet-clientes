"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Eraser,
  Hand,
  Loader2,
  Pentagon,
  Trash2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import {
  CLAVE_SESSION_STORAGE,
  ErrorApiKey,
  actualizarZona,
  aplicarTrazo,
  crearZona,
  eliminarZona,
  getLienzo,
  publicarCobertura,
} from "../../_lib/cobertura-admin";
import type {
  ConfigVisor,
  Lienzo,
  ZonaCobertura,
} from "../../_lib/cobertura-admin";
import {
  METROS_POR_PASO,
  claveCelda,
  colorDensidad,
} from "../../_lib/cobertura-grid";
import type { Herramienta } from "./MapaEditor";

const MapaEditor = dynamic(() => import("./MapaEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[440px] w-full animate-pulse rounded-2xl border border-border bg-surface-deep" />
  ),
});

type Celda = { latitud: number; longitud: number; densidad: number };

/** Lo necesario para revertir un trazo: densidad previa de cada celda tocada. */
type EntradaDeshacer = Map<string, { celda: Celda; densidadPrevia: number | null }>;

const HERRAMIENTAS: { id: Herramienta; icono: typeof Brush; label: string }[] = [
  { id: "mover", icono: Hand, label: "Mover" },
  { id: "pincel", icono: Brush, label: "Pincel" },
  { id: "goma", icono: Eraser, label: "Goma" },
  { id: "poligono", icono: Pentagon, label: "Polígono" },
];

export default function EditorCobertura() {
  // El componente se monta solo en el cliente (`dynamic(..., { ssr: false })`),
  // así que `sessionStorage` ya existe en el primer render y la clave guardada
  // se puede leer como estado inicial, sin un efecto de montaje.
  const [apiKey, setApiKey] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem(CLAVE_SESSION_STORAGE)
  );
  const [claveEscrita, setClaveEscrita] = useState("");
  const [lienzo, setLienzo] = useState<Lienzo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [celdas, setCeldas] = useState<Map<string, Celda>>(new Map());
  const [zonas, setZonas] = useState<ZonaCobertura[]>([]);

  const [herramienta, setHerramienta] = useState<Herramienta>("mover");
  const [radio, setRadio] = useState(3);
  const [intensidad, setIntensidad] = useState(80);
  const [tipoCobertura, setTipoCobertura] = useState("fibra");

  const [verticesEnCurso, setVerticesEnCurso] = useState<[number, number][]>([]);
  const [nombreZona, setNombreZona] = useState("");
  const [densidadZona, setDensidadZona] = useState(70);
  const [idZonaSeleccionada, setIdZonaSeleccionada] = useState<number | null>(
    null
  );

  const [pilaDeshacer, setPilaDeshacer] = useState<EntradaDeshacer[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [publicadoEn, setPublicadoEn] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // El pincel corre dentro de listeners de Leaflet que no se vuelven a montar en
  // cada render: los valores vivos van por ref para no recrear los handlers.
  const herramientaRef = useRef(herramienta);
  const intensidadRef = useRef(intensidad);
  const tipoRef = useRef(tipoCobertura);
  const apiKeyRef = useRef(apiKey);

  // Sin lista de dependencias: sincroniza las refs después de cada render.
  // Escribirlas en el cuerpo del componente sería escribir durante el render.
  useEffect(() => {
    herramientaRef.current = herramienta;
    intensidadRef.current = intensidad;
    tipoRef.current = tipoCobertura;
    apiKeyRef.current = apiKey;
  });

  /** Acumulador del trazo en curso; se vacía al soltar el botón. */
  const trazoRef = useRef<EntradaDeshacer>(new Map());

  /**
   * Fuente de verdad de las celdas mientras se pinta.
   *
   * El estado `celdas` existe solo para renderizar. La bitácora de deshacer
   * necesita leer la densidad previa **en el mismo tick** en que ocurre la
   * pincelada, y el updater de `setCeldas` no sirve para eso: React puede
   * diferirlo, y además los updaters tienen que ser puros. Con esta ref, soltar
   * el botón en el mismo tick que el último movimiento no pierde el trazo.
   */
  const celdasRef = useRef<Map<string, Celda>>(new Map());

  const sincronizarCeldas = useCallback(() => {
    setCeldas(new Map(celdasRef.current));
  }, []);

  // --- Carga inicial --------------------------------------------------------

  // Ningún `setState` antes del primer `await`: el efecto de abajo solo dispara
  // la carga, no muta estado de forma síncrona durante el commit.
  const cargarLienzo = useCallback(async (clave: string) => {
    try {
      const datos = await getLienzo(clave);
      setError(null);
      setLienzo(datos);
      setZonas(datos.zonas);
      celdasRef.current = new Map(
        datos.puntos.map((p) => [
          claveCelda(p.latitud, p.longitud),
          {
            latitud: p.latitud,
            longitud: p.longitud,
            densidad: p.densidad_cobertura ?? 0,
          },
        ])
      );
      sincronizarCeldas();
      sessionStorage.setItem(CLAVE_SESSION_STORAGE, clave);
    } catch (e) {
      if (e instanceof ErrorApiKey) {
        sessionStorage.removeItem(CLAVE_SESSION_STORAGE);
        setApiKey(null);
        setError("La clave de administrador no es válida.");
      } else {
        setError("No fue posible cargar el editor. ¿Está corriendo el backend?");
      }
    }
  }, [sincronizarCeldas]);

  // `setTimeout(fn, 0)` es la convención del repo para fetch en efecto (ver
  // docs/conventions.md): saca el setState del cuerpo del efecto y evita el
  // warning de `act()` en los tests.
  useEffect(() => {
    if (!apiKey) return;
    const id = setTimeout(() => void cargarLienzo(apiKey), 0);
    return () => clearTimeout(id);
  }, [apiKey, cargarLienzo]);

  // --- Pincel ---------------------------------------------------------------

  const alPintar = useCallback(
    (afectadas: { latitud: number; longitud: number }[]) => {
      const borrando = herramientaRef.current === "goma";
      const actuales = celdasRef.current;

      for (const { latitud, longitud } of afectadas) {
        const clave = claveCelda(latitud, longitud);

        // Solo la primera vez que el trazo toca la celda: ese es el estado al
        // que hay que volver si se deshace, no el de la pasada anterior.
        if (!trazoRef.current.has(clave)) {
          const previa = actuales.get(clave);
          trazoRef.current.set(clave, {
            celda: {
              latitud,
              longitud,
              densidad: borrando ? 0 : intensidadRef.current,
            },
            densidadPrevia: previa ? previa.densidad : null,
          });
        }

        if (borrando) {
          actuales.delete(clave);
        } else {
          actuales.set(clave, {
            latitud,
            longitud,
            densidad: intensidadRef.current,
          });
        }
      }

      sincronizarCeldas();
    },
    [sincronizarCeldas]
  );

  const alFinTrazo = useCallback(async () => {
    const trazo = trazoRef.current;
    trazoRef.current = new Map();

    if (trazo.size === 0) return;
    const clave = apiKeyRef.current;
    if (!clave) return;

    const borrando = herramientaRef.current === "goma";
    const celdasTrazo = [...trazo.values()].map((e) => e.celda);

    setPilaDeshacer((pila) => [...pila.slice(-19), trazo]);
    setGuardando(true);

    try {
      await aplicarTrazo(clave, {
        tipo_cobertura: tipoRef.current,
        ...(borrando
          ? {
              borrar: celdasTrazo.map((c) => ({
                latitud: c.latitud,
                longitud: c.longitud,
              })),
            }
          : { pintar: celdasTrazo }),
      });
      setAviso(null);
    } catch {
      setAviso("No se pudo guardar el último trazo. Revisá la conexión.");
    } finally {
      setGuardando(false);
    }
  }, []);

  const deshacer = useCallback(async () => {
    const clave = apiKeyRef.current;
    if (!clave || pilaDeshacer.length === 0) return;

    const ultima = pilaDeshacer[pilaDeshacer.length - 1];
    setPilaDeshacer((pila) => pila.slice(0, -1));

    const restaurar: Celda[] = [];
    const quitar: { latitud: number; longitud: number }[] = [];

    for (const { celda, densidadPrevia } of ultima.values()) {
      if (densidadPrevia === null) {
        quitar.push({ latitud: celda.latitud, longitud: celda.longitud });
      } else {
        restaurar.push({ ...celda, densidad: densidadPrevia });
      }
    }

    for (const c of quitar) celdasRef.current.delete(claveCelda(c.latitud, c.longitud));
    for (const c of restaurar)
      celdasRef.current.set(claveCelda(c.latitud, c.longitud), c);
    sincronizarCeldas();

    setGuardando(true);
    try {
      await aplicarTrazo(clave, {
        tipo_cobertura: tipoRef.current,
        pintar: restaurar,
        borrar: quitar,
      });
    } catch {
      setAviso("No se pudo deshacer en el servidor.");
    } finally {
      setGuardando(false);
    }
  }, [pilaDeshacer, sincronizarCeldas]);

  // --- Polígonos ------------------------------------------------------------

  const agregarVertice = useCallback((vertice: [number, number]) => {
    setVerticesEnCurso((previos) => [...previos, vertice]);
  }, []);

  async function guardarZona() {
    if (!apiKey || verticesEnCurso.length < 3) return;
    setGuardando(true);
    try {
      const zona = await crearZona(apiKey, {
        nombre: nombreZona || undefined,
        densidad_cobertura: densidadZona,
        tipo_cobertura: tipoCobertura,
        vertices: verticesEnCurso,
      });
      setZonas((previas) => [...previas, zona]);
      setVerticesEnCurso([]);
      setNombreZona("");
      setAviso(null);
    } catch {
      setAviso("No se pudo guardar la zona.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarZona(
    idZona: number,
    cambios: Parameters<typeof actualizarZona>[2]
  ) {
    if (!apiKey) return;
    setGuardando(true);
    try {
      const zona = await actualizarZona(apiKey, idZona, cambios);
      setZonas((previas) =>
        previas.map((z) => (z.id_zona === idZona ? zona : z))
      );
    } catch {
      setAviso("No se pudo actualizar la zona.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrarZona(idZona: number) {
    if (!apiKey) return;
    setGuardando(true);
    try {
      await eliminarZona(apiKey, idZona);
      setZonas((previas) => previas.filter((z) => z.id_zona !== idZona));
      setIdZonaSeleccionada(null);
    } catch {
      setAviso("No se pudo eliminar la zona.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Publicar -------------------------------------------------------------

  async function publicar() {
    if (!apiKey) return;
    setGuardando(true);
    try {
      const { publicado_en } = await publicarCobertura(apiKey);
      setPublicadoEn(publicado_en);
      setAviso(null);
    } catch {
      setAviso("No se pudo publicar. Revisá ADMIN_API_KEY en apps/view/.env.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Render ---------------------------------------------------------------

  if (!apiKey) {
    return (
      <form
        className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (claveEscrita.trim()) setApiKey(claveEscrita.trim());
        }}
      >
        <h2 className="font-semibold text-foreground">Clave de administrador</h2>
        <p className="mt-2 text-sm text-muted">
          Todavía no existe el inicio de sesión de administración. Por ahora se
          usa el valor de <code>ADMIN_API_KEY</code>; queda en esta pestaña y se
          borra al cerrarla.
        </p>
        <input
          type="password"
          value={claveEscrita}
          onChange={(e) => setClaveEscrita(e.target.value)}
          placeholder="ADMIN_API_KEY"
          className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
          autoFocus
        />
        {error && (
          <p className="mt-3 text-sm text-on-error-container">{error}</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2 font-medium text-background"
        >
          Entrar
        </button>
      </form>
    );
  }

  // Derivado, no estado: hay clave pero todavía no llegó el lienzo ni un error.
  if (!lienzo) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} aria-hidden />
        {error ?? "Cargando editor…"}
      </div>
    );
  }

  const zonaSeleccionada = zonas.find((z) => z.id_zona === idZonaSeleccionada);

  return (
    <div className="space-y-4">
      <Barra
        herramienta={herramienta}
        onHerramienta={setHerramienta}
        radio={radio}
        onRadio={setRadio}
        intensidad={intensidad}
        onIntensidad={setIntensidad}
        tipoCobertura={tipoCobertura}
        onTipoCobertura={setTipoCobertura}
        puedeDeshacer={pilaDeshacer.length > 0}
        onDeshacer={deshacer}
        onPublicar={publicar}
        guardando={guardando}
        publicadoEn={publicadoEn}
        totalCeldas={celdas.size}
      />

      {aviso && (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          {aviso}
        </p>
      )}

      <MapaEditor
        config={lienzo.config as ConfigVisor}
        paso={lienzo.paso_grilla}
        celdas={celdas}
        zonas={zonas}
        herramienta={herramienta}
        radio={radio}
        intensidad={intensidad}
        verticesEnCurso={verticesEnCurso}
        idZonaSeleccionada={idZonaSeleccionada}
        onPintar={alPintar}
        onFinTrazo={alFinTrazo}
        onAgregarVertice={agregarVertice}
        onSeleccionarZona={setIdZonaSeleccionada}
      />

      {herramienta === "poligono" && (
        <PanelPoligono
          vertices={verticesEnCurso}
          nombre={nombreZona}
          onNombre={setNombreZona}
          densidad={densidadZona}
          onDensidad={setDensidadZona}
          onGuardar={guardarZona}
          onDescartar={() => setVerticesEnCurso([])}
          guardando={guardando}
        />
      )}

      {zonaSeleccionada && (
        <PanelZona
          zona={zonaSeleccionada}
          onCambiar={(cambios) => cambiarZona(zonaSeleccionada.id_zona, cambios)}
          onEliminar={() => borrarZona(zonaSeleccionada.id_zona)}
          onCerrar={() => setIdZonaSeleccionada(null)}
          guardando={guardando}
        />
      )}
    </div>
  );
}

// --- Subcomponentes ---------------------------------------------------------

function Barra({
  herramienta,
  onHerramienta,
  radio,
  onRadio,
  intensidad,
  onIntensidad,
  tipoCobertura,
  onTipoCobertura,
  puedeDeshacer,
  onDeshacer,
  onPublicar,
  guardando,
  publicadoEn,
  totalCeldas,
}: {
  herramienta: Herramienta;
  onHerramienta: (h: Herramienta) => void;
  radio: number;
  onRadio: (r: number) => void;
  intensidad: number;
  onIntensidad: (i: number) => void;
  tipoCobertura: string;
  onTipoCobertura: (t: string) => void;
  puedeDeshacer: boolean;
  onDeshacer: () => void;
  onPublicar: () => void;
  guardando: boolean;
  publicadoEn: string | null;
  totalCeldas: number;
}) {
  const pintando = herramienta === "pincel" || herramienta === "goma";

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-2xl border border-border bg-surface p-4">
      <div role="group" aria-label="Herramienta" className="flex gap-1">
        {HERRAMIENTAS.map(({ id, icono: Icono, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onHerramienta(id)}
            aria-pressed={herramienta === id}
            title={label}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition ${
              herramienta === id
                ? "bg-primary text-background"
                : "text-muted hover:bg-surface-deep"
            }`}
          >
            <Icono size={18} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {pintando && (
        <>
          <label className="text-xs text-muted">
            Tamaño: {radio} celdas (~{radio * 2 * METROS_POR_PASO} m)
            <input
              type="range"
              min={0}
              max={12}
              value={radio}
              onChange={(e) => onRadio(Number(e.target.value))}
              className="mt-1 block w-40"
            />
          </label>

          {herramienta === "pincel" && (
            <label className="text-xs text-muted">
              Intensidad: {intensidad}%
              <input
                type="range"
                min={0}
                max={100}
                value={intensidad}
                onChange={(e) => onIntensidad(Number(e.target.value))}
                className="mt-1 block w-40"
                style={{ accentColor: colorDensidad(intensidad, 1) }}
              />
            </label>
          )}
        </>
      )}

      <label className="text-xs text-muted">
        Tipo
        <select
          value={tipoCobertura}
          onChange={(e) => onTipoCobertura(e.target.value)}
          className="mt-1 block rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="fibra">Fibra</option>
          <option value="mixta">Mixta</option>
          <option value="parcial">Parcial</option>
        </select>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted">
          {totalCeldas.toLocaleString("es-CL")} celdas
          {guardando && " · guardando…"}
          {publicadoEn &&
            ` · publicado ${new Date(publicadoEn).toLocaleTimeString("es-CL")}`}
        </span>

        <button
          type="button"
          onClick={onDeshacer}
          disabled={!puedeDeshacer || guardando}
          className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm text-foreground disabled:opacity-40"
        >
          <Undo2 size={16} aria-hidden />
          Deshacer
        </button>

        <button
          type="button"
          onClick={onPublicar}
          disabled={guardando}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          <UploadCloud size={16} aria-hidden />
          Publicar
        </button>
      </div>
    </div>
  );
}

function PanelPoligono({
  vertices,
  nombre,
  onNombre,
  densidad,
  onDensidad,
  onGuardar,
  onDescartar,
  guardando,
}: {
  vertices: [number, number][];
  nombre: string;
  onNombre: (v: string) => void;
  densidad: number;
  onDensidad: (v: number) => void;
  onGuardar: () => void;
  onDescartar: () => void;
  guardando: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">
        Hacé click en el mapa para marcar los vértices. Llevás{" "}
        <strong className="text-foreground">{vertices.length}</strong>
        {vertices.length < 3 && " (mínimo 3)"}.
      </p>

      <label className="text-xs text-muted">
        Nombre
        <input
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          placeholder="La Pintana norte"
          className="mt-1 block rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>

      <label className="text-xs text-muted">
        Densidad: {densidad}%
        <input
          type="range"
          min={0}
          max={100}
          value={densidad}
          onChange={(e) => onDensidad(Number(e.target.value))}
          className="mt-1 block w-40"
          style={{ accentColor: colorDensidad(densidad, 1) }}
        />
      </label>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onDescartar}
          disabled={vertices.length === 0}
          className="rounded-xl border border-border px-3 py-2 text-sm text-foreground disabled:opacity-40"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onGuardar}
          disabled={vertices.length < 3 || guardando}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          Guardar zona
        </button>
      </div>
    </div>
  );
}

function PanelZona({
  zona,
  onCambiar,
  onEliminar,
  onCerrar,
  guardando,
}: {
  zona: ZonaCobertura;
  onCambiar: (cambios: Parameters<typeof actualizarZona>[2]) => void;
  onEliminar: () => void;
  onCerrar: () => void;
  guardando: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="text-xs text-muted">Zona seleccionada</p>
        <p className="font-medium text-foreground">
          {zona.nombre ?? `Zona ${zona.id_zona}`}
        </p>
      </div>

      <label className="text-xs text-muted">
        Densidad: {zona.densidad_cobertura}%
        <input
          type="range"
          min={0}
          max={100}
          value={zona.densidad_cobertura}
          onChange={(e) =>
            onCambiar({ densidad_cobertura: Number(e.target.value) })
          }
          className="mt-1 block w-40"
          style={{ accentColor: colorDensidad(zona.densidad_cobertura, 1) }}
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={zona.activo}
          onChange={(e) => onCambiar({ activo: e.target.checked })}
        />
        Visible en el mapa público
      </label>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-xl border border-border px-3 py-2 text-sm text-foreground"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onEliminar}
          disabled={guardando}
          className="flex items-center gap-1 rounded-xl bg-error px-3 py-2 text-sm font-medium text-on-error disabled:opacity-40"
        >
          <Trash2 size={16} aria-hidden />
          Eliminar
        </button>
      </div>
    </div>
  );
}
