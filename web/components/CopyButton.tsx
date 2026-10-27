"use client";
import { useState } from "react";
export function CopyButton({ text, label = "Copy note for clinical document" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { alert(text); } }}
    className="px-4 py-2 rounded-lg bg-cgh-blue text-white text-sm font-bold hover:bg-cgh-blue-dark transition">{done ? "Copied to clipboard" : label}</button>;
}
