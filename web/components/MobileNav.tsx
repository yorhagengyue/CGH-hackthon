"use client";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
/** Second header row on small screens. Hidden on the questionnaire so the patient only sees the logo and the form. */
export function MobileNav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  if (path.startsWith("/survey")) return null;
  return <div className="md:hidden border-t border-slate-100 px-2 py-1.5 overflow-x-auto [scrollbar-width:none]"><Nav items={items} /></div>;
}
