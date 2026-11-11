import { NextResponse } from "next/server";
import { ensurePushSubscriptionsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function isAppleMobileUserAgent(userAgent: string) {
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}
export async function POST(request: Request) {
  try {
    await ensurePushSubscriptionsTable();
    const body = (await request.json()) as SubscriptionBody;
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!isAppleMobileUserAgent(userAgent)) {
      return NextResponse.json({ error: "현재 Apple 기기 알림만 테스트할 수 있습니다." }, { status: 403 });
    }
    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json({ error: "푸시 구독 정보가 올바르지 않습니다." }, { status: 400 });
    }
    await getSql()`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, device_platform)
      VALUES (${endpoint}, ${p256dh}, ${auth}, ${userAgent.slice(0, 500)}, 'APPLE')
      ON CONFLICT (endpoint) DO UPDATE
      SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent, device_platform = 'APPLE', updated_at = CURRENT_TIMESTAMP
    `;
    return NextResponse.json({ subscribed: true });
  } catch (error) {
    logApiError("[api/push/subscriptions] POST failed", error);
    return NextResponse.json({ error: "알림 기기를 등록하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensurePushSubscriptionsTable();
    const body = (await request.json()) as { endpoint?: unknown };
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return NextResponse.json({ error: "구독 주소가 필요합니다." }, { status: 400 });
    await getSql()`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    return NextResponse.json({ subscribed: false });
  } catch (error) {
    logApiError("[api/push/subscriptions] DELETE failed", error);
    return NextResponse.json({ error: "알림 기기 등록을 해제하지 못했습니다." }, { status: 500 });
  }
}

