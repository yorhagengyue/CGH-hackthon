# Web Push

Minimal Web Push app using Next.js, TypeScript, and Neon. The app expects an existing Neon `subscriptions` table; it does not create or initialize database schema.

The table must have:

- `endpoint TEXT PRIMARY KEY`
- `subscription_json JSONB NOT NULL`

Set `DATABASE_URL` to the Neon connection string, then generate VAPID keys and run:

```sh
npm install
npm run generate-vapid-keys
DATABASE_URL="your-neon-connection-string" \
VAPID_PUBLIC_KEY="your-public-key" \
VAPID_PRIVATE_KEY="your-private-key" \
VAPID_SUBJECT="mailto:you@example.com" \
PUSH_ADMIN_TOKEN="choose-a-long-random-secret" \
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), subscribe the browser, and send a test notification. Use HTTPS when deploying.

Keep the Neon connection string, private VAPID key, and admin token server-side.

## API

- `GET /api/status` — returns whether VAPID is configured, the public VAPID key, and subscription count.
- `POST /api/subscribe` — stores a browser PushSubscription.
- `DELETE /api/subscribe` — removes a subscription by endpoint.
- `POST /api/send` — sends a notification; requires `Authorization: Bearer <PUSH_ADMIN_TOKEN>`. Body: `{ "title": "...", "body": "...", "url": "/" }`. The optional URL must be a same-site path.

Expired subscriptions are deleted when the push service returns 404 or 410.
