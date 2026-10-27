"use client";

import { useEffect, useState, type FormEvent } from "react";

interface ServerStatus {
  configured: boolean;
  publicKey: string | null;
}

interface ApiResponse {
  error?: string;
  sent?: number;
  failed?: number;
}

async function requestApi(path: string, init?: RequestInit): Promise<ApiResponse> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    }
  });
  const result = await response.json() as ApiResponse;
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result;
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`;
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export default function Home() {
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [statusResponse] = await Promise.all([
          fetch("/api/status"),
          "serviceWorker" in navigator ? navigator.serviceWorker.register("/sw.js") : Promise.resolve(null)
        ]);
        if (!statusResponse.ok) throw new Error("Could not load Web Push status.");
        const status = await statusResponse.json() as ServerStatus;
        if (active) setServer(status);

        if ("serviceWorker" in navigator && "PushManager" in window) {
          const registration = await navigator.serviceWorker.ready;
          const existing = await registration.pushManager.getSubscription();
          if (active) setSubscription(existing);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not initialize Web Push.");
      }
    }

    void initialize();
    return () => { active = false; };
  }, []);

  async function subscribe() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!server?.configured || !server.publicKey) {
        throw new Error("Configure VAPID keys on the server first.");
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("This browser does not support Web Push.");
      }
      if (!window.isSecureContext) throw new Error("Web Push requires HTTPS, or localhost for development.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const next = current ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(server.publicKey)
      });
      await requestApi("/api/subscribe", { method: "POST", body: JSON.stringify(next) });
      setSubscription(next);
      setMessage("Browser subscribed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not subscribe this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await requestApi("/api/subscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setMessage("Browser unsubscribed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not unsubscribe this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await requestApi("/api/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ title, body, url })
      });
      setMessage(`Sent to ${result.sent ?? 0} browser(s); ${result.failed ?? 0} failed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send push notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Web Push</h1>
      <section>
        <h2>Subscription</h2>
        <p>{subscription ? "This browser is subscribed." : "This browser is not subscribed."}</p>
        {subscription
          ? <button type="button" onClick={unsubscribe} disabled={busy}>Unsubscribe</button>
          : <button type="button" onClick={subscribe} disabled={busy || !server?.configured}>Subscribe this browser</button>}
        {!server?.configured && <p>Set VAPID keys on the server to enable subscriptions.</p>}
      </section>

      <section>
        <h2>Send notification</h2>
        <form onSubmit={send}>
          <label>
            Admin token
            <input type="password" autoComplete="off" required value={adminToken} onChange={event => setAdminToken(event.target.value)} />
          </label>
          <label>
            Title
            <input maxLength={80} required value={title} onChange={event => setTitle(event.target.value)} />
          </label>
          <label>
            Message
            <textarea maxLength={180} required value={body} onChange={event => setBody(event.target.value)} />
          </label>
          <label>
            Tap destination (same-site path)
            <input value={url} onChange={event => setUrl(event.target.value)} />
          </label>
          <button type="submit" disabled={busy}>Send push</button>
        </form>
      </section>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
