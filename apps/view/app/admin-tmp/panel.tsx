'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  guardarConfiguracion,
  dispararRevision,
  asignarDiaVencimiento,
  type Configuracion,
  type ContratoVencido,
  type Resultado,
  type ResultadoRevision,
} from './_lib/admin-api';

const caja: React.CSSProperties = {
  border: '1px solid #999',
  padding: 12,
  marginBottom: 14,
};
const ok: React.CSSProperties = {
  background: '#e8f5e9',
  border: '1px solid #2e7d32',
  padding: 8,
  marginTop: 8,
};
const mal: React.CSSProperties = {
  background: '#ffebee',
  border: '1px solid #c62828',
  padding: 8,
  marginTop: 8,
};
const td: React.CSSProperties = { border: '1px solid #999', padding: '4px 8px' };

export function Panel({
  config,
  cartera,
  page,
}: {
  config: Resultado<Configuracion>;
  cartera: Resultado<{
    data: ContratoVencido[];
    total: number;
    page: number;
    limit: number;
  }>;
  page: number;
}) {
  return (
    <>
      <div style={{ background: '#fff3e0', border: '2px dashed #e65100', padding: 8, marginBottom: 14 }}>
        <b>PANEL PROVISORIO</b> — se borra cuando exista el panel real.
        Backend: <code>localhost:4000</code>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        <BloqueConfig config={config} />
        <BloqueRevision />
        <BloqueVencimiento />
      </div>

      <BloqueCartera cartera={cartera} page={page} />
    </>
  );
}

/* ── CU-80 ────────────────────────────────────────────────────────────────── */

function BloqueConfig({ config }: { config: Resultado<Configuracion> }) {
  const [estado, accion, pendiente] = useActionState<
    Resultado<Configuracion> | null,
    FormData
  >(guardarConfiguracion, null);

  const actual = estado?.ok ? estado.data : config.ok ? config.data : null;

  return (
    <section style={caja}>
      <h2 style={{ marginTop: 0 }}>CU-80 · Parámetros de morosidad</h2>

      {!config.ok && !estado && (
        <div style={mal}>
          <b>Error {config.status}:</b> {config.error}
        </div>
      )}

      {actual && (
        <form action={accion}>
          <p>
            días de gracia (0–90):{' '}
            <input name="dias_gracia" type="number" defaultValue={actual.dias_gracia} style={{ width: 80 }} />
          </p>
          <p>
            umbral de suspensión:{' '}
            <input name="umbral_suspension" type="number" step="0.01" defaultValue={actual.umbral_suspension} style={{ width: 130 }} />
          </p>
          <button disabled={pendiente}>{pendiente ? 'guardando…' : 'guardar'}</button>
          <p style={{ fontSize: 11, color: '#555' }}>
            última actualización: {actual.fecha_actualizacion ?? '(nunca)'}
          </p>
        </form>
      )}

      {estado?.ok === true && (
        <div style={ok}>
          Guardado: gracia {estado.data.dias_gracia} · umbral {estado.data.umbral_suspension}
        </div>
      )}
      {estado?.ok === false && (
        <div style={mal}>
          <b>Error {estado.status}:</b> {estado.error}
        </div>
      )}
      <p style={{ fontSize: 11, color: '#555' }}>
        Excepción 2: probá gracia <b>91</b> o <b>-1</b> → 400 con el rango.
      </p>
    </section>
  );
}

/* ── CU-47 ────────────────────────────────────────────────────────────────── */

function BloqueRevision() {
  const [r, setR] = useState<Resultado<ResultadoRevision> | null>(null);
  const [cargando, setCargando] = useState(false);

  return (
    <section style={caja}>
      <h2 style={{ marginTop: 0 }}>CU-47 · Revisión de morosidad</h2>
      <p style={{ fontSize: 11, color: '#555' }}>
        Corre sola a las 00:00 (Chile). Este botón hace lo mismo sin esperar.
      </p>
      <button
        disabled={cargando}
        onClick={async () => {
          setCargando(true);
          setR(await dispararRevision());
          setCargando(false);
        }}
      >
        {cargando ? 'corriendo…' : 'correr revisión ahora'}
      </button>

      {r?.ok === true && (
        <div style={ok}>
          <div>procesados: <b>{r.data.contratos_procesados}</b></div>
          <div>marcados morosos: <b>{r.data.contratos_marcados}</b> → {JSON.stringify(r.data.ids_marcados)}</div>
          <div>omitidos (día inválido): <b>{r.data.contratos_omitidos}</b></div>
          <div style={{ fontSize: 11 }}>{r.data.inicio} → {r.data.fin}</div>
        </div>
      )}
      {r?.ok === false && (
        <div style={mal}>
          <b>Error {r.status}:</b> {r.error}
        </div>
      )}
    </section>
  );
}

/* ── CU-54 ────────────────────────────────────────────────────────────────── */

function BloqueVencimiento() {
  const [estado, accion, pendiente] = useActionState<
    Resultado<{ id_contrato: number; dia_vencimiento: number }> | null,
    FormData
  >(asignarDiaVencimiento, null);

  return (
    <section style={caja}>
      <h2 style={{ marginTop: 0 }}>CU-54 · Día de vencimiento</h2>
      <form action={accion}>
        <p>
          id_contrato:{' '}
          <input name="id_contrato" type="number" defaultValue={1} style={{ width: 80 }} />
        </p>
        <p>
          día (1–28):{' '}
          <input name="dia_vencimiento" type="number" defaultValue={5} style={{ width: 80 }} />
        </p>
        <button disabled={pendiente}>{pendiente ? 'guardando…' : 'asignar'}</button>
      </form>

      {estado?.ok === true && (
        <div style={ok}>
          Contrato {estado.data.id_contrato} → día {estado.data.dia_vencimiento}
        </div>
      )}
      {estado?.ok === false && (
        <div style={mal}>
          <b>Error {estado.status}:</b> {estado.error}
        </div>
      )}
      <p style={{ fontSize: 11, color: '#555' }}>
        Excepción 2: día <b>31</b> o <b>0</b> → 400 · día <b>5.5</b> → &quot;sin decimales&quot; ·
        contrato <b>999999</b> → 404.
      </p>
    </section>
  );
}

/* ── CU-55 ────────────────────────────────────────────────────────────────── */

function BloqueCartera({
  cartera,
  page,
}: {
  cartera: Resultado<{
    data: ContratoVencido[];
    total: number;
    page: number;
    limit: number;
  }>;
  page: number;
}) {
  if (!cartera.ok) {
    return (
      <section style={caja}>
        <h2 style={{ marginTop: 0 }}>CU-55 · Cartera vencida</h2>
        <div style={mal}>
          <b>Error {cartera.status}:</b> {cartera.error}
        </div>
      </section>
    );
  }

  const { data, total, limit } = cartera.data;
  const ultima = Math.max(1, Math.ceil(total / limit));

  return (
    <section style={caja}>
      <h2 style={{ marginTop: 0 }}>
        CU-55 · Cartera vencida <span style={{ fontWeight: 400 }}>({total} contratos)</span>
      </h2>

      {data.length === 0 ? (
        <div style={{ background: '#fffde7', border: '1px solid #f9a825', padding: 8 }}>
          No hay contratos con saldo vencido. (Excepción 3: vista vacía, no error)
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={td}>contrato</th>
              <th style={td}>rut</th>
              <th style={td}>nombre</th>
              <th style={td}>saldo vencido</th>
              <th style={td}>facturas</th>
              <th style={td}>días</th>
              <th style={td}>CU-56</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id_contrato}>
                <td style={td}>{c.id_contrato}</td>
                <td style={td}>{c.rut ?? '—'}</td>
                <td style={td}>{c.nombre_completo ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  ${c.saldo_vencido.toLocaleString('es-CL')}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{c.facturas_vencidas}</td>
                <td style={{ ...td, textAlign: 'right' }}>{c.dias_vencido}</td>
                <td style={td}>
                  <Link href={`/admin-tmp/cartera/${c.id_contrato}`}>ver detalle →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 8, display: 'flex', gap: 12 }}>
        {page > 1 && <Link href={`/admin-tmp?page=${page - 1}`}>← anterior</Link>}
        <span>página {page} de {ultima}</span>
        {page < ultima && <Link href={`/admin-tmp?page=${page + 1}`}>siguiente →</Link>}
      </p>
    </section>
  );
}
