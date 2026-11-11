import { NextResponse } from "next/server";
import * as webpush from "web-push";
import { ensurePushSubscriptionsTable, ensureRemindersTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });

  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      return NextResponse.json({ error: "VAPID 환경 변수가 설정되지 않았습니다." }, { status: 503 });
    }

    await Promise.all([ensureRemindersTable(), ensurePushSubscriptionsTable()]);
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const sql = getSql();
    const reminders = await sql`
      UPDATE notification_reminders
      SET claimed_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id FROM notification_reminders
        WHERE sent_at IS NULL
          AND scheduled_at <= CURRENT_TIMESTAMP
          AND (claimed_at IS NULL OR claimed_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes')
        ORDER BY scheduled_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, title, body
    `;
    const subscriptions = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE device_platform = 'APPLE'
    `;
    let delivered = 0;

    for (const reminder of reminders) {
      const payload = JSON.stringify({
        title: String(reminder.title),
        body: String(reminder.body),
        url: "/",
        tag: `between-days-reminder-${reminder.id}`
      });
      const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({
            endpoint: String(subscription.endpoint),
            keys: { p256dh: String(subscription.p256dh), auth: String(subscription.auth) }
          }, payload, { TTL: 86400 });
          delivered += 1;
        } catch (error) {
          const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${String(subscription.endpoint)}`;
            return;
          }
          throw error;
        }
      }));
      const hadTemporaryFailure = results.some((result) => result.status === "rejected");
      if (hadTemporaryFailure && subscriptions.length > 0) {
        await sql`UPDATE notification_reminders SET claimed_at = NULL WHERE id = ${reminder.id}`;
      } else {
        await sql`DELETE FROM notification_reminders WHERE id = ${reminder.id}`;
      }
    }

    return NextResponse.json({ processed: reminders.length, delivered });
  } catch (error) {
    logApiError("[api/cron/notifications] GET failed", error);
    return NextResponse.json({ error: "예약 알림 발송에 실패했습니다." }, { status: 500 });
  }
}

