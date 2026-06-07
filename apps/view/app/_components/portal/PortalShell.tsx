"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import PortalSidebar from "./PortalSidebar";

export default function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      <PortalSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu del portal"
            className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            Portal Cliente
          </span>
        </div>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
