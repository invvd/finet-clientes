/**
 * PANEL PROVISORIO — SE BORRA.
 * Feo a propósito. Solo sirve para probar a mano los CU del bloque Deuda mientras el panel
 * administrativo real (que hace otro grupo) no existe.
 */
export default function AdminTmpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'auto',
        background: '#fff',
        color: '#000',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 13,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
