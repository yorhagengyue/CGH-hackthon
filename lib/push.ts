import { timingSafeEqual } from "node:crypto";
import webPush from "web-push";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let configured = false;

export function configureWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (Boolean(publicKey) !== Boolean(privateKey)) {
    throw new Error("Set both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
  }
  if (!publicKey || !privateKey) return false;

  if (!configured) {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
      publicKey,
      privateKey
    );
    configured = true;
  }
  return true;
}

export function isValidSubscription(value: unknown): value is PushSubscriptionData {
  if (!value || typeof value !== "object") return false;
  const subscription = value as Partial<PushSubscriptionData>;
  if (
    typeof subscription.endpoint !== "string" ||
    typeof subscription.keys?.p256dh !== "string" ||
    typeof subscription.keys?.auth !== "string"
  ) {
    return false;
  }

  try {
    const endpoint = new URL(subscription.endpoint);
    return endpoint.protocol === "https:" && !endpoint.username && !endpoint.password;
  } catch {
    return false;
  }
}

export function hasValidAdminToken(authorization: string | null): boolean {
  const expected = process.env.PUSH_ADMIN_TOKEN;
  if (!expected || !authorization?.startsWith("Bearer ")) return false;

  const provided = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export function isValidNotificationPath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return false;
  try {
    return new URL(value, "https://push.invalid").origin === "https://push.invalid";
  } catch {
    return false;
  }
}

export { webPush };
