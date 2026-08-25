import type { Metadata } from "next";
import FinancialReportsPanel from "@/app/_components/admin/FinancialReportsPanel";

export const metadata: Metadata = {
  title: "Reportes financieros",
  robots: { index: false, follow: false },
};

export default function ReportesAdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <FinancialReportsPanel />
    </main>
  );
}
