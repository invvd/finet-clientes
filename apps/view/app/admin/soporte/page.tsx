import type { Metadata } from "next";
import SoportePanel from "@/app/_components/soporte/SoportePanel";

export const metadata: Metadata = {
  title: "Panel de soporte",
  robots: { index: false, follow: false },
};

export default function SoporteAdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <SoportePanel />
    </main>
  );
}
