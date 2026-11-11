"use client";

import { FormEvent, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import type { Reminder } from "@/types/reminder";
import type { Schedule } from "@/types/schedule";
import { getSeoulDate } from "@/utils/dday";

type ModalState = { mode: "create" } | { mode: "edit"; reminder: Reminder } | null;
type NotificationMode = "custom" | "schedule";

export type NotificationSectionHandle = { refresh: () => Promise<boolean> };
type Props = { onModalOpenChange?: (open: boolean) => void };

function toSeoulDateTimeInput(isoString: string) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(date).reduce<Record<string, string>>((record, part) => {
    record[part.type] = part.value;
    return record;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function defaultDateTime() {
  return toSeoulDateTimeInput(new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

function formatReminderDate(isoString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(isoString));
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export const NotificationSection = forwardRef<NotificationSectionHandle, Props>(function NotificationSection({ onModalOpenChange }, ref) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [mode, setMode] = useState<NotificationMode>("custom");
  const [scheduleId, setScheduleId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pushState, setPushState] = useState<"checking" | "nonApple" | "unsupported" | "unconfigured" | "denied" | "subscribed" | "unsubscribed">("checking");
  const [pushBusy, setPushBusy] = useState(false);

  const initialValues = useMemo(() => modal?.mode === "edit" ? {
    mode: modal.reminder.scheduleId ? "schedule" as const : "custom" as const,
    scheduleId: modal.reminder.scheduleId ? String(modal.reminder.scheduleId) : "",
    title: modal.reminder.title,
    body: modal.reminder.body,
    scheduledAt: toSeoulDateTimeInput(modal.reminder.scheduledAt)
  } : { mode: "custom" as const, scheduleId: "", title: "", body: "", scheduledAt: "" }, [modal]);
  const dirty = mode !== initialValues.mode || scheduleId !== initialValues.scheduleId || title !== initialValues.title || body !== initialValues.body || scheduledAt !== initialValues.scheduledAt;

  const loadReminders = useCallback(async () => {
    try {
      const response = await fetch("/api/reminders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "알림을 불러오지 못했습니다.");
      setReminders(data);
      setError(null);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알림을 불러오지 못했습니다.");
      return false;
    }
  }, []);

  useImperativeHandle(ref, () => ({ refresh: loadReminders }), [loadReminders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReminders();
      void fetch("/api/schedules", { cache: "no-store" }).then(async (response) => {
        if (response.ok) {
          const today = getSeoulDate();
          const items = (await response.json()) as Schedule[];
          setSchedules(items.filter((schedule) => schedule.startDate >= today));
        }
      });
      void checkPushState();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReminders]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function checkPushState() {
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (!isAppleMobile) {
      setPushState("nonApple");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    const config = await fetch("/api/push/config", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ configured: false }));
    if (!config.configured) {
      setPushState("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();
    setPushState(subscription ? "subscribed" : "unsubscribed");
  }

  async function subscribePush() {
    setPushBusy(true);
    setError(null);
    try {
      const configResponse = await fetch("/api/push/config", { cache: "no-store" });
      const config = await configResponse.json();
      if (!config.configured) throw new Error("푸시 서버 키가 아직 설정되지 않았습니다.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON())
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "이 기기의 알림을 켜지 못했습니다.");
      setPushState("subscribed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이 기기의 알림을 켜지 못했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  async function unsubscribePush() {
    setPushBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setPushState("unsubscribed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알림을 끄지 못했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  async function sendTestPush() {
    setPushBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("Apple 기기 알림을 먼저 켜주세요.");
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "테스트 알림을 보내지 못했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "테스트 알림을 보내지 못했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  function requestClose() {
    if (saving) return;
    if (dirty && !window.confirm("저장하지 않은 변경사항이 있습니다.\n저장하지 않고 닫으시겠습니까?")) return;
    setModal(null);
    onModalOpenChange?.(false);
  }

  function openCreate() {
    setMode("custom"); setScheduleId(""); setTitle(""); setBody(""); setScheduledAt(defaultDateTime());
    setError(null); setConfirmDelete(false); setModal({ mode: "create" }); onModalOpenChange?.(true);
  }

  function openEdit(reminder: Reminder) {
    setMode(reminder.scheduleId ? "schedule" : "custom");
    setScheduleId(reminder.scheduleId ? String(reminder.scheduleId) : "");
    setTitle(reminder.title); setBody(reminder.body); setScheduledAt(toSeoulDateTimeInput(reminder.scheduledAt));
    setError(null); setConfirmDelete(false); setModal({ mode: "edit", reminder }); onModalOpenChange?.(true);
  }

  function chooseSchedule(value: string) {
    setScheduleId(value);
    const schedule = schedules.find((item) => item.id === Number(value));
    if (!schedule) return;
    setTitle(schedule.title);
    setBody(schedule.memo?.trim() || `${schedule.startDate} 일정이 있어요.`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("알림 제목을 입력해주세요.");
    if (!body.trim()) return setError("알림 내용을 입력해주세요.");
    if (!scheduledAt) return setError("알림 날짜와 시간을 입력해주세요.");
    if (mode === "schedule" && !scheduleId) return setError("알림에 연결할 일정을 선택해주세요.");
    if (new Date(`${scheduledAt}:00+09:00`).getTime() <= Date.now()) return setError("현재보다 이후 시간을 선택해주세요.");

    setSaving(true); setError(null);
    try {
      const editing = modal?.mode === "edit";
      const response = await fetch(editing ? `/api/reminders/${modal.reminder.id}` : "/api/reminders", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), scheduledAt: `${scheduledAt}:00+09:00`, scheduleId: mode === "schedule" ? Number(scheduleId) : null })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "알림을 저장하지 못했습니다.");
      setReminders((current) => editing ? current.map((item) => item.id === data.id ? data : item) : [...current, data].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      setModal(null); onModalOpenChange?.(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알림을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removeReminder() {
    if (modal?.mode !== "edit") return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/reminders/${modal.reminder.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "알림을 삭제하지 못했습니다.");
      setReminders((current) => current.filter((item) => item.id !== modal.reminder.id));
      setModal(null); onModalOpenChange?.(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알림을 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="notification-section" aria-labelledby="notification-title">
      <div className="notification-header">
        <div><h2 id="notification-title">🔔 알림</h2><p>캘린더를 닫아도 예약 시간에 알려드려요.</p></div>
        <button type="button" className="notification-add" onClick={openCreate}>+ 알림 추가</button>
      </div>

      <div className="notification-device-row">
        {pushState === "subscribed" ? (
          <><span className="notification-status-on">● Apple 기기 알림 켜짐</span><div className="notification-device-actions"><button type="button" onClick={() => void sendTestPush()} disabled={pushBusy}>{pushBusy ? "전송 중..." : "테스트 알림"}</button><button type="button" onClick={() => void unsubscribePush()} disabled={pushBusy}>끄기</button></div></>
        ) : pushState === "unsubscribed" ? (
          <><span>Apple 기기에서 테스트 푸시를 받으려면 알림을 켜주세요.</span><button type="button" onClick={() => void subscribePush()} disabled={pushBusy}>{pushBusy ? "설정 중..." : "Apple 알림 켜기"}</button></>
        ) : pushState === "denied" ? <span>브라우저 설정에서 Between Days 알림 권한을 허용해주세요.</span>
          : pushState === "nonApple" ? <span>현재 Apple 기기 알림만 테스트하고 있습니다.</span>
          : pushState === "unsupported" ? <span>이 브라우저는 앱 푸시를 지원하지 않습니다. iPhone은 홈 화면에 추가한 뒤 실행해주세요.</span>
          : pushState === "unconfigured" ? <span>푸시 서버 설정 전입니다. 예약은 저장할 수 있지만 기기 알림은 운영 키 설정 후 사용할 수 있어요.</span>
          : <span>알림 기기 상태를 확인하는 중...</span>}
      </div>

      <div className="notification-list">
        {reminders.length === 0 ? <p className="notification-empty">예정된 알림이 없습니다.</p> : reminders.map((reminder) => (
          <button key={reminder.id} type="button" className="notification-item" onClick={() => openEdit(reminder)}>
            <span className="notification-item-time">{formatReminderDate(reminder.scheduledAt)}</span>
            <strong>{reminder.title}</strong>
            <span className="notification-item-body">{reminder.body}</span>
          </button>
        ))}
      </div>
      {!modal && error ? <p className="notification-error">{error}</p> : null}

      {modal ? (
        <div className="notification-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
          <section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title">
            <h2 id="notification-modal-title">{modal.mode === "create" ? "알림 추가" : "알림 수정"}</h2>
            <form onSubmit={submit}>
              <fieldset><legend>알림 내용 선택</legend><div className="notification-mode-row">
                <label><input type="radio" checked={mode === "custom"} onChange={() => { setMode("custom"); setScheduleId(""); }} /> 직접 입력</label>
                <label><input type="radio" checked={mode === "schedule"} onChange={() => setMode("schedule")} /> 캘린더 일정 선택</label>
              </div></fieldset>
              {mode === "schedule" ? <label>일정<select value={scheduleId} onChange={(event) => chooseSchedule(event.target.value)}><option value="">오늘 이후 일정을 선택해주세요</option>{schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.startDate} · {schedule.title}</option>)}</select></label> : null}
              <label>알림 날짜와 시간<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
              <label>제목<input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>내용<textarea maxLength={500} rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
              {error ? <p className="notification-error">{error}</p> : null}
              {confirmDelete ? <div className="notification-delete-confirm"><p>이 알림을 삭제하시겠습니까?</p><div><button type="button" onClick={() => setConfirmDelete(false)}>취소</button><button type="button" className="notification-danger" onClick={() => void removeReminder()} disabled={saving}>삭제</button></div></div> : (
                <div className="notification-actions">
                  {modal.mode === "edit" ? <button type="button" className="notification-danger" onClick={() => setConfirmDelete(true)}>삭제</button> : <span />}
                  <div><button type="button" onClick={requestClose}>취소</button><button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div>
                </div>
              )}
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
});
