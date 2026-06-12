"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AudienceSwitchProps = {
  items: { label: string; href: string }[];
};

export default function AudienceSwitch({ items }: AudienceSwitchProps) {
  const pathname = usePathname();
  const isEmpresas = pathname.startsWith("/empresas");

  return (
    <nav aria-label="Tipo de cliente">
      <ul className="flex items-center gap-4">
        {items.map((item, i) => {
          const isActive =
            item.href === "/"
              ? !isEmpresas && (pathname === "/" || !pathname.startsWith("/empresas"))
              : i === 1 && isEmpresas;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted hover:text-foreground transition-colors"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
