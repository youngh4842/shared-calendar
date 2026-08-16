"use client";

import { FormEvent, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import type { DDayItem } from "@/types/dday";
import { getDDayLabel, getSeoulDate } from "@/utils/dday";

type ModalState = { mode: "create" } | { mode: "edit"; item: DDayItem } | null;

export type DDaySectionHandle = {
  refresh: () => Promise<boolean>;
};

type DDaySectionProps = {
  onModalOpenChange?: (open: boolean) => void;
};

export const DDaySection = forwardRef<DDaySectionHandle, DDaySectionProps>(function DDaySection({ onModalOpenChange }, ref) {
  const [items, setItems] = useState<DDayItem[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = getSeoulDate();

  const initialValues = useMemo(() => modal?.mode === "edit"
    ? { title: modal.item.title, targetDate: modal.item.targetDate }
    : { title: "", targetDate: "" }, [modal]);
  const dirty = title !== initialValues.title || targetDate !== initialValues.targetDate;

  const loadItems = useCallback(async () => {
    try {
      const response = await fetch("/api/ddays", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "D-Day를 불러오지 못했습니다.");
      setItems(data);
      setError(null);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "D-Day를 불러오지 못했습니다.");
      return false;
    }
  }, []);

  useImperativeHandle(ref, () => ({ refresh: loadItems }), [loadItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadItems(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function requestClose() {
    if (saving) return;
    if (dirty && !window.confirm("저장하지 않은 변경사항이 있습니다.\n저장하지 않고 닫으시겠습니까?")) return;
    setModal(null);
    onModalOpenChange?.(false);
  }

  function openCreate() {
    setTitle("");
    setTargetDate("");
    setError(null);
    setConfirmDelete(false);
    setModal({ mode: "create" });
    onModalOpenChange?.(true);
  }

  function openEdit(item: DDayItem) {
    setTitle(item.title);
    setTargetDate(item.targetDate);
    setError(null);
    setConfirmDelete(false);
    setModal({ mode: "edit", item });
    onModalOpenChange?.(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return setError("제목을 입력해주세요.");
    if (!targetDate) return setError("날짜를 입력해주세요.");

    setSaving(true);
    setError(null);
    try {
      const editing = modal?.mode === "edit";
      const response = await fetch(editing ? `/api/ddays/${modal.item.id}` : "/api/ddays", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, targetDate })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "D-Day를 저장하지 못했습니다.");
      setItems((current) => editing
        ? current.map((item) => item.id === data.id ? data : item)
        : [...current, data]);
      setModal(null);
      onModalOpenChange?.(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "D-Day를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    if (modal?.mode !== "edit") return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/ddays/${modal.item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "D-Day를 삭제하지 못했습니다.");
      setItems((current) => current.filter((item) => item.id !== modal.item.id));
      setModal(null);
      onModalOpenChange?.(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "D-Day를 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dday-section">
      <div className="dday-list" aria-label="D-Day 목록">
        <button type="button" className="dday-add" onClick={openCreate} aria-label="D-Day 추가">+</button>
        {items.map((item) => (
          <button key={item.id} type="button" className={`dday-chip ${item.targetDate === today ? "dday-chip-today" : ""}`} onClick={() => openEdit(item)}>
            <span>{item.title}</span> <strong>{getDDayLabel(item.targetDate, today)}</strong>
          </button>
        ))}
      </div>
      {!modal && error ? <p className="dday-error">{error}</p> : null}

      {modal ? (
        <div className="dday-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
          <section className="dday-modal" role="dialog" aria-modal="true" aria-labelledby="dday-modal-title">
            <h2 id="dday-modal-title">{modal.mode === "create" ? "D-Day 추가" : "D-Day 수정"}</h2>
            <form onSubmit={submit}>
              <label>제목<input autoFocus maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>날짜<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
              {error ? <p className="dday-error">{error}</p> : null}
              {confirmDelete ? (
                <div className="dday-delete-confirm"><p>이 D-Day를 삭제하시겠습니까?</p><div><button type="button" onClick={() => setConfirmDelete(false)}>취소</button><button type="button" className="dday-danger" onClick={() => void removeItem()} disabled={saving}>삭제</button></div></div>
              ) : (
                <div className="dday-actions">
                  {modal.mode === "edit" ? <button type="button" className="dday-danger" onClick={() => setConfirmDelete(true)}>삭제</button> : <span />}
                  <div><button type="button" onClick={requestClose}>취소</button><button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div>
                </div>
              )}
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
});
