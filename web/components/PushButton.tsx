"use client";
import { useEffect, useState } from "react";
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };

/** "Turn on reminders": asks for notification permission and stores the Web Push subscription. */
export function PushButton({ publicKey }: { publicKey?: string }) {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied" | "busy">("busy");
  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.register("/sw.js").then((r) => r.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => setState("unsupported"));
  }, [publicKey]);
  const enable = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey!) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      setState(r.ok ? "on" : "off");
    } catch { setState(Notification.permission === "denied" ? "denied" : "off"); }
  };
  if (state === "unsupported") return null;
  if (state === "on") return <span className="inline-flex items-center gap-1.5 text-sm text-ok font-semibold">Reminders on this device are on</span>;
  if (state === "denied") return <span className="text-sm text-slate-500">Notifications are blocked in your browser settings.</span>;
  return <button type="button" onClick={enable} disabled={state === "busy"} className="px-4 py-2 rounded-lg border border-cgh-blue text-cgh-blue text-sm font-bold hover:bg-cgh-mist disabled:opacity-50">Turn on reminders</button>;
}
