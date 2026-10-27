"use client";
import { useActionState } from "react";
type Act = (state: unknown, fd: FormData) => Promise<{ error?: string; ok?: string } | void>;
export function ActionForm({ action, children, submit = "Save", className = "" }: { action: Act; children: React.ReactNode; submit?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action as never, null) as [{ error?: string; ok?: string } | null, (fd: FormData) => void, boolean];
  return <form action={formAction} className={`space-y-3 ${className}`}>{children}
    {state?.error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
    {state?.ok && <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">{state.ok}</p>}
    <button disabled={pending} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">{pending ? "…" : submit}</button></form>;
}
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm"><span className="block text-gray-600 mb-1">{label}</span>{children}</label>;
export const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm";
