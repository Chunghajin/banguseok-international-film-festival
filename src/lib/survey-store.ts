"use client";
import { useSyncExternalStore } from "react";
import { DRAFT_KEY, MEMORY_NOTICE, newSurveyDraft, readSurveyDraft, writeSurveyDraft, type DraftLoad, type SurveyDraft } from "./survey-draft";
type Snapshot = DraftLoad & { ready: boolean };
const serverSnapshot: Snapshot = { draft: null, notice: "", canPersist: true, ready: false };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
function load() {
  try {
    snapshot = { ...readSurveyDraft(window.localStorage), ready: true };
    // Persist upgrades/repairs immediately; a reload must never reshuffle them.
    if (snapshot.draft && snapshot.canPersist && !writeSurveyDraft(window.localStorage, snapshot.draft))
      snapshot = { ...snapshot, canPersist: false, notice: MEMORY_NOTICE };
  }
  catch { snapshot = { draft: null, notice: MEMORY_NOTICE, canPersist: false, ready: true }; }
}
function getSnapshot() { if (!snapshot.ready && typeof window !== "undefined") load(); return snapshot; }
function onStorage(event: StorageEvent) {
  if (event.key !== DRAFT_KEY && event.key !== null) return;
  load(); listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
export function saveDraft(draft: SurveyDraft) {
  let canPersist = snapshot.canPersist;
  let notice = snapshot.notice;
  if (canPersist) {
    try { canPersist = writeSurveyDraft(window.localStorage, draft); } catch { canPersist = false; }
    notice = canPersist ? "" : MEMORY_NOTICE;
  }
  snapshot = { draft, ready: true, canPersist, notice };
  listeners.forEach(listener => listener());
}
export function currentDraft() { return getSnapshot().draft; }
export function startDraft() { const draft = newSurveyDraft(); saveDraft(draft); return draft; }
export function useSurveyDraft() { return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot); }
