import Link from 'next/link';
import { leerDetalle } from '../../_lib/admin-api';

export const dynamic = 'force-dynamic';

/** CU-56 — detalle: deuda, historial de pagos y datos del cliente. */
export default async function DetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await leerDetalle(Number(id));

  if (!r.ok) {
    return (
      <div>
        <p><Link href="/admin-tmp">← volver al panel</Link></p>
        <div style={{ background: '#fee', padding: 10, border: '1px solid #c00' }}>
          <b>Error {r.status}:</b> {r.error}
        </div>
      </div>
    );
  }

  const d = r.data;

  return (
    <div>
      <p><Link href="/admin-tmp">← volver al panel</Link></p>
      <h1>CU-56 — Contrato {d.id_contrato}</h1>

      <h2>Cliente</h2>
      {d.cliente ? (
        <ul>
          <li>rut: {d.cliente.rut ?? '—'}</li>
          <li>nombre: {d.cliente.nombre_completo}</li>
          <li>email: {d.cliente.email ?? '—'}</li>
          <li>teléfono: {d.cliente.telefono ?? '—'}</li>
        </ul>
      ) : (
        <p>(sin cliente asociado)</p>
      )}

      <h2>Contrato</h2>
      <ul>
        <li>estado: {d.estado}</li>
        <li>día de vencimiento: {d.dia_vencimiento}</li>
        <li>plan: {d.plan ?? '—'}</li>
        <li><b>saldo vencido: {d.saldo_vencido.toLocaleString('es-CL')}</b></li>
      </ul>

      <h2>Facturas ({d.facturas.length})</h2>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>id</th><th>período</th><th>monto</th>
            <th>límite de pago</th><th>estado</th><th>días vencida</th>
          </tr>
        </thead>
        <tbody>
          {d.facturas.map((f) => (
            <tr key={f.id_factura}>
              <td>{f.id_factura}</td>
              <td>{f.periodo}</td>
              <td align="right">{f.monto.toLocaleString('es-CL')}</td>
              <td>{f.fecha_limite_pago}</td>
              <td>{f.estado}</td>
              <td align="right">{f.dias_vencida ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Historial de pagos ({d.historial_pagos.length})</h2>
      {d.historial_pagos.length === 0 ? (
        <p>Sin pagos registrados.</p>
      ) : (
        <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>id</th><th>monto</th><th>fecha</th><th>pasarela</th></tr>
          </thead>
          <tbody>
            {d.historial_pagos.map((p) => (
              <tr key={p.id_pago}>
                <td>{p.id_pago}</td>
                <td align="right">{p.monto.toLocaleString('es-CL')}</td>
                <td>{p.fecha_pago}</td>
                <td>{p.pasarela}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
