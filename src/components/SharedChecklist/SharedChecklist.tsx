"use client";

import type { PointerEvent } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ChecklistItem } from "@/types/checklist";
import { sortChecklistItems } from "@/lib/checklist";

type DragState = {
  id: number;
  isCompleted: boolean;
  overId: number | null;
  moved: boolean;
};

function reorderSameGroup(items: ChecklistItem[], draggingId: number, overId: number) {
  const dragging = items.find((item) => item.id === draggingId);
  const over = items.find((item) => item.id === overId);

  if (!dragging || !over || dragging.isCompleted !== over.isCompleted || dragging.id === over.id) {
    return items;
  }

  const group = items.filter((item) => item.isCompleted === dragging.isCompleted);
  const others = items.filter((item) => item.isCompleted !== dragging.isCompleted);
  const withoutDragging = group.filter((item) => item.id !== dragging.id);
  const overIndex = withoutDragging.findIndex((item) => item.id === over.id);

  if (overIndex < 0) {
    return items;
  }

  const reorderedGroup = [...withoutDragging.slice(0, overIndex), dragging, ...withoutDragging.slice(overIndex)].map((item, index) => ({
    ...item,
    sortOrder: index + 1
  }));

  return sortChecklistItems([...others, ...reorderedGroup]);
}

function getGroupPayload(items: ChecklistItem[], isCompleted: boolean) {
  return items
    .filter((item) => item.isCompleted === isCompleted)
    .map((item, index) => ({
      id: item.id,
      sortOrder: index + 1
    }));
}

async function fetchChecklistItems() {
  const response = await fetch("/api/checklist");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "체크리스트를 불러오지 못했습니다.");
  }

  return sortChecklistItems(data as ChecklistItem[]);
}

export function SharedChecklist() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChecklistItem | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  const sortedItems = useMemo(() => sortChecklistItems(items), [items]);

  useEffect(() => {
    if (isExpanded && isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding, isExpanded]);

  useEffect(() => {
    let ignore = false;

    async function loadItems() {
      try {
        const nextItems = await fetchChecklistItems();

        if (!ignore) {
          setItems(nextItems);
          setError(null);
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "체크리스트를 불러오지 못했습니다.");
        }
      }
    }

    void loadItems();

    return () => {
      ignore = true;
    };
  }, []);

  function setPending(id: number, pending: boolean) {
    setPendingIds((previous) => {
      const next = new Set(previous);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setError(null);
      inputRef.current?.focus();
      return;
    }

    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "체크리스트를 등록하지 못했습니다.");
      }

      setItems((previous) => sortChecklistItems([...previous, data as ChecklistItem]));
      setContent("");
      setIsAdding(false);
      setIsExpanded(true);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "체크리스트를 등록하지 못했습니다.");
    }
  }

  async function toggleItem(item: ChecklistItem) {
    if (pendingIds.has(item.id)) {
      return;
    }

    setPending(item.id, true);

    try {
      const response = await fetch(`/api/checklist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !item.isCompleted })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "체크리스트를 수정하지 못했습니다.");
      }

      setItems((previous) => sortChecklistItems([...previous.filter((previousItem) => previousItem.id !== item.id), data as ChecklistItem]));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "체크리스트를 수정하지 못했습니다.");
    } finally {
      setPending(item.id, false);
    }
  }

  async function deleteItem(item: ChecklistItem) {
    if (pendingIds.has(item.id)) {
      return;
    }

    setPending(item.id, true);

    try {
      const response = await fetch(`/api/checklist/${item.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "체크리스트를 삭제하지 못했습니다.");
      }

      setItems((previous) => previous.filter((previousItem) => previousItem.id !== item.id));
      setDeleteTarget(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "체크리스트를 삭제하지 못했습니다.");
    } finally {
      setPending(item.id, false);
    }
  }

  async function saveOrder(nextItems: ChecklistItem[], isCompleted: boolean) {
    const response = await fetch("/api/checklist/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: getGroupPayload(nextItems, isCompleted) })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "체크리스트 순서를 저장하지 못했습니다.");
    }
  }

  function handleDragStart(event: PointerEvent<HTMLButtonElement>, item: ChecklistItem) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ id: item.id, isCompleted: item.isCompleted, overId: null, moved: false });
  }

  function handleDragMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const row = element?.closest<HTMLElement>("[data-checklist-row-id]");
    const overId = row ? Number(row.dataset.checklistRowId) : null;
    const overItem = overId ? sortedItems.find((item) => item.id === overId) : null;

    if (!overItem || overItem.isCompleted !== dragState.isCompleted) {
      setDragState((previous) => (previous ? { ...previous, overId: null, moved: true } : previous));
      return;
    }

    setDragState((previous) => (previous ? { ...previous, overId, moved: true } : previous));
  }

  async function handleDragEnd(event: PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const currentDragState = dragState;
    setDragState(null);

    if (!currentDragState.moved || !currentDragState.overId || currentDragState.overId === currentDragState.id) {
      return;
    }

    const nextItems = reorderSameGroup(sortedItems, currentDragState.id, currentDragState.overId);
    setItems(nextItems);

    try {
      await saveOrder(nextItems, currentDragState.isCompleted);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "체크리스트 순서를 저장하지 못했습니다.");
      void fetchChecklistItems()
        .then((latestItems) => setItems(latestItems))
        .catch(() => undefined);
    }
  }

  return (
    <section className="shared-checklist" aria-label="공유 체크리스트">
      <div className="shared-checklist-toolbar">
        <button type="button" className="shared-checklist-icon-button" onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? "체크리스트 접기" : "체크리스트 펼치기"}>
          {isExpanded ? "⌄" : ">"}
        </button>
        <button
          type="button"
          className="shared-checklist-icon-button"
          onClick={() => {
            const wasExpanded = isExpanded;
            setIsExpanded(true);
            setIsAdding((value) => (wasExpanded ? !value : true));
          }}
          aria-label="체크리스트 추가"
        >
          +
        </button>
      </div>

      {isExpanded ? (
        <div className="shared-checklist-content-area">
          {isAdding ? (
            <form className="shared-checklist-form" onSubmit={addItem}>
              <input ref={inputRef} value={content} onChange={(event) => setContent(event.target.value)} maxLength={300} placeholder="내용을 입력해주세요" aria-label="체크리스트 내용" />
              <button type="submit">추가</button>
            </form>
          ) : null}

          {error ? <p className="shared-checklist-error">{error}</p> : null}

          <div className="shared-checklist-list">
            {sortedItems.map((item) => {
              const isPending = pendingIds.has(item.id);
              const isDragging = dragState?.id === item.id;
              const isDragTarget = dragState?.overId === item.id;

              return (
                <div
                  key={item.id}
                  className={[
                    "shared-checklist-row",
                    item.isCompleted ? "shared-checklist-row-completed" : "",
                    isPending ? "shared-checklist-row-pending" : "",
                    isDragging ? "shared-checklist-row-dragging" : "",
                    isDragTarget ? "shared-checklist-row-drag-target" : ""
                  ].join(" ")}
                  data-checklist-row-id={item.id}
                >
                  <button type="button" className="shared-checklist-check" onClick={() => toggleItem(item)} disabled={isPending} aria-label={item.isCompleted ? "완료 해제" : "완료"}>
                    {item.isCompleted ? "☑" : "□"}
                  </button>
                  <span className="shared-checklist-item-content">{item.content}</span>
                  <button type="button" className="shared-checklist-delete" onClick={() => setDeleteTarget(item)} disabled={isPending} aria-label="삭제">
                    ×
                  </button>
                  <button
                    type="button"
                    className="shared-checklist-drag"
                    onPointerDown={(event) => handleDragStart(event, item)}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={() => setDragState(null)}
                    aria-label="순서 이동"
                  >
                    =
                  </button>
                </div>
              );
            })}
          </div>

          {deleteTarget ? (
            <div className="shared-checklist-confirm" role="dialog" aria-modal="false" aria-label="체크리스트 삭제 확인">
              <p>이 항목을 삭제하시겠습니까?</p>
              <div>
                <button type="button" onClick={() => setDeleteTarget(null)}>
                  취소
                </button>
                <button type="button" className="shared-checklist-confirm-delete" onClick={() => deleteItem(deleteTarget)}>
                  삭제
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
