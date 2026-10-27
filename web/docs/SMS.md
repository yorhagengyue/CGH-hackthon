# SMS reminders

This app keeps appointment reminders in the `notifications` table and processes them with a scheduled dispatcher. SMS is simulated unless all Twilio settings are configured.

## Reminder lifecycle

When staff create an appointment, the app queues two SMS notifications for the patient:

- `reminder_7d`: seven days before the appointment
- `reminder_3d`: three days before the appointment

Each linked caregiver is also queued the same two reminders. The caregiver message is prefixed with `[For your parent]`. Each queued item records its recipient (`user_id`), appointment, message, and `send_at` time. An in-app notification is also created for the patient when the appointment is scheduled.

Reminder messages include the appointment date and a questionnaire URL. `APP_URL` supplies the URL origin; it defaults to `http://localhost:3000`. Set it to the deployed app's canonical HTTPS origin so reminders contain working links.

The reminder scheduler subtracts seven or three calendar days from the appointment time and sets the resulting time to 09:00 in the server's local timezone. Vercel cron schedules use UTC; check the runtime timezone if the intended local send time is important.

## Dispatch

`GET /api/sms` and `POST /api/sms` dispatch notifications with `channel = 'sms'`, no `sent_at`, and `send_at` at or before the current time. Both methods require `Authorization: Bearer <CRON_SECRET>`. The `key` query parameter is not accepted. In the staff SMS outbox (`/sms`), staff can also use **Run dispatcher** to process due items manually.

The Vercel cron configuration calls `/api/sms` daily at `01:00 UTC` (`0 1 * * *`), which is `09:00` in Singapore. Configure `CRON_SECRET` in Vercel. Requests return `503` if the secret is not configured and `401` if the bearer token is missing or incorrect.

For an authorized manual dispatch, call:

```sh
curl -X POST "$APP_URL/api/sms" \
  -H "Authorization: Bearer $CRON_SECRET"
```

The JSON response includes `processed`, `sent`, `simulated`, and `failed` counts. `sent` means Twilio accepted the API request; it is not a handset delivery receipt. `processed` counts due queue entries considered. Entries with no phone number or a failed Twilio request remain pending for a later retry. The endpoint returns `502` if any due rows failed, otherwise `200`.

## Twilio configuration

Set all of the following in the deployment environment to enable real SMS:

| Variable | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio account used to send messages |
| `TWILIO_AUTH_TOKEN` | Server-side Twilio API credential |
| `TWILIO_FROM` | Twilio sender number, normally in E.164 format |
| `CRON_SECRET` | Strong random bearer secret for scheduled/manual API dispatch |
| `APP_URL` | Public app origin used to construct survey links |

Copy `web/.env.example` to `web/.env.local` for local configuration. In Vercel, add these values to the project's environment settings. Keep `TWILIO_AUTH_TOKEN` and `CRON_SECRET` server-side; never expose them in client-side environment variables.

All three Twilio values must be present to send real SMS. If all are absent, due entries are simulated and marked processed without an external request; the response increments `simulated`. If only some Twilio values are set, dispatch fails with a configuration error. A recipient without a phone number is counted as failed and stays pending. The dispatcher checks Twilio's HTTP response and leaves a rejected or timed-out message pending for retry.

## Operations and troubleshooting

1. Confirm the appointment has a date and time and that the expected rows appear in `/sms`.
2. Check each recipient's phone number on their account. Use a normalized international format accepted by Twilio (for Singapore, typically `+65` followed by the number).
3. Check `send_at` and the deployment timezone when a reminder is not yet due.
4. Check the Vercel cron invocation and application logs for dispatcher errors.
5. Check Twilio credentials, sender configuration, account status, and message logs for real delivery issues.
6. To test without sending live SMS, leave all three Twilio settings unset. Dispatch will report due rows as `simulated` and mark them processed.

Reminder text contains appointment information and a questionnaire link. Keep message content minimal, protect patient phone numbers and provider credentials, and use the application's approved consent and communications policies before sending to real recipients.
