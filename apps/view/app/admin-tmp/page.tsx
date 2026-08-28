import { leerConfiguracion, listarCartera } from './_lib/admin-api';
import { Panel } from './panel';

export const dynamic = 'force-dynamic';

export default async function AdminTmpPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);

  const [config, cartera] = await Promise.all([
    leerConfiguracion(),
    listarCartera(page, 20),
  ]);

  return <Panel config={config} cartera={cartera} page={page} />;
}
