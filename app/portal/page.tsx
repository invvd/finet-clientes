import { getContract, getBalance, getTickets } from './_lib/portal-api';
import ContractStatusBadge from '@/app/_components/portal/ContractStatusBadge';
import PlanSummarySection from '@/app/_components/portal/PlanSummarySection';
import DebtStatusSection from '@/app/_components/portal/DebtStatusSection';
import WifiPasswordSection from '@/app/_components/portal/WifiPasswordSection';
import OoklaSpeedTest from '@/app/_components/portal/OoklaSpeedTest';
import TicketsSection from '@/app/_components/portal/TicketsSection';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const [contract, balance, tickets] = await Promise.all([
    getContract(),
    getBalance(),
    getTickets(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
      {/* Saludo */}
      <div>
        <p className="text-sm text-muted">Bienvenido/a</p>
        <h1 className="text-2xl font-bold text-foreground">{contract.userName}</h1>
      </div>

      {/* Estado + Plan — 1 col en móvil, 2 cols en md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ContractStatusBadge status={contract.status} />
        <PlanSummarySection plans={contract.plans} />
      </div>

      {/* Saldo / Deuda — full width */}
      <DebtStatusSection balance={balance} />

      {/* Cambio de contraseña WiFi — RF-25: solo si el contrato está Activo */}
      {contract.status === 'Activo' && <WifiPasswordSection />}

      {/* Velocidad de red — RF-26 */}
      <OoklaSpeedTest />

      {/* Tickets de soporte — full width */}
      <TicketsSection tickets={tickets} />
    </div>
  );
}
