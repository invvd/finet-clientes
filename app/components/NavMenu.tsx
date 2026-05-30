"use client";

import { useState } from "react";
import Link from "next/link";

export type NavSection = {
  title: string;
  link: string;
};

type NavMenuProps = {
  sections: NavSection[];
};

export default function NavMenu({ sections }: NavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-controls="menu-movil"
        aria-expanded={isOpen}
        className="border px-3 py-2"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        {isOpen ? "Cerrar" : "Menu"}
      </button>
      <ul id="menu-movil" hidden={!isOpen} className="grid gap-3 pt-4 md:hidden">
        {sections.map((section) => (
          <li key={section.link}>
            <Link href={section.link}>{section.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
