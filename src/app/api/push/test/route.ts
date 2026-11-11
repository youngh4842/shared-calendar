import { NextResponse } from "next/server";
import * as webpush from "web-push";
import { ensurePushSubscriptionsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

export async function POST(request: Request) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      return NextResponse.json({ error: "푸시 서버 설정이 완료되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as { endpoint?: unknown };
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return NextResponse.json({ error: "테스트할 기기 구독이 없습니다." }, { status: 400 });

    await ensurePushSubscriptionsTable();
    const rows = await getSql()`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE endpoint = ${endpoint} AND device_platform = 'APPLE'
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "등록된 Apple 기기를 찾지 못했습니다." }, { status: 404 });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification({
      endpoint: String(rows[0].endpoint),
      keys: { p256dh: String(rows[0].p256dh), auth: String(rows[0].auth) }
    }, JSON.stringify({
      title: "Between Days 테스트",
      body: "Apple 기기 푸시 알림이 정상적으로 연결됐어요.",
      url: "/",
      tag: "between-days-apple-test"
    }), { TTL: 60 });

    return NextResponse.json({ delivered: true });
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    if (statusCode === 404 || statusCode === 410) {
      return NextResponse.json({ error: "기기 구독이 만료되었습니다. 알림을 다시 켜주세요." }, { status: 410 });
    }
    logApiError("[api/push/test] POST failed", error);
    return NextResponse.json({ error: "테스트 알림을 보내지 못했습니다." }, { status: 500 });
  }
}
