"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useAuth } from "../../../_lib/auth";

export default function UserMenu() {
  const { cliente } = useAuth();

  if (!cliente) return null;

  return (
    <Link
      href="/portal"
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <User size={16} aria-hidden />
      Portal Cliente
    </Link>
  );
}
