import type { Metadata } from "next";
import SecurityEventsPanel from "@/app/_components/admin/SecurityEventsPanel";

export const metadata: Metadata = {
  title: "Eventos de seguridad",
  robots: { index: false, follow: false },
};

export default function SeguridadAdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <SecurityEventsPanel />
    </main>
  );
}
