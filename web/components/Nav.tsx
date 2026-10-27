"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function Nav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const current = path + (sp.get("tab") ? `?tab=${sp.get("tab")}` : "");
  return <nav className="flex gap-1 whitespace-nowrap">{items.map(([href, label]) => {
    const active = href === current || (href === path && !href.includes("?") && !sp.get("tab"));
    return <Link key={href} href={href} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${active ? "bg-cgh-blue text-white" : "text-slate-600 hover:bg-cgh-mist hover:text-cgh-blue"}`}>{label}</Link>;
  })}</nav>;
}
