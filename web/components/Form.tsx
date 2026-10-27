"use client";
import { useActionState } from "react";
type Act = (state: unknown, fd: FormData) => Promise<{ error?: string; ok?: string } | void>;
export function ActionForm({ action, children, submit = "Save", className = "", stickySubmit = false, wide = false }: { action: Act; children: React.ReactNode; submit?: string; className?: string; stickySubmit?: boolean; wide?: boolean }) {
  const [state, formAction, pending] = useActionState(action as never, null) as [{ error?: string; ok?: string } | null, (fd: FormData) => void, boolean];
  const btn = <button disabled={pending} className={`${wide ? "w-full h-11" : "w-full sm:w-auto py-3 sm:py-2.5"} px-5 rounded-xl bg-cgh-blue text-white text-sm font-bold hover:bg-cgh-blue-dark disabled:opacity-50 transition`}>{pending ? "Sending" : submit}</button>;
  return <form action={formAction} className={`space-y-3 ${className}`}>{children}
    {state?.error && <p className="text-sm text-danger bg-danger-bg rounded-lg px-3 py-2">{state.error}</p>}
    {state?.ok && <p className="text-sm text-ok bg-ok-bg rounded-lg px-3 py-2">{state.ok}</p>}
    {stickySubmit ? <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200">{btn}</div> : btn}</form>;
}
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm"><span className="block text-slate-600 font-medium mb-1">{label}</span>{children}</label>;
export const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cgh-sky/50 focus:border-cgh-blue";
