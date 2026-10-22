import { newAwardState, restoreAwards, categoryRecord, candidateOrder, type AwardState } from "./award-state.ts";
import { EMPTY_SURVEY, QUESTIONS, validAnswer, type Answer, type QuestionId, type Survey } from "./survey.ts";

// Keep the M1 storage key so existing answers and UUIDs survive the M2 upgrade.
export const DRAFT_KEY = "banguseok:m1-draft:v1.1";
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export type SurveyDraft = AwardState & {
  draft_version: "draft-v1.1"; survey_version: "survey-v1.1";
  catalog_version: "awards-v1.1"; rules_version: "result-v1.1";
  draft_id: string; survey: Survey; current_question: number;
  current_screen: "survey" | "awards" | "category" | "review" | "result"; updated_at: string;
};
export type DraftLoad = { draft: SurveyDraft | null; notice: string; canPersist: boolean };
export const MEMORY_NOTICE = "이 브라우저에 초안을 저장할 수 없어요. 현재 창에서는 계속할 수 있지만, 새로고침하거나 나가면 답변을 잃을 수 있어요.";
export function newSurveyDraft(now = Date.now()): SurveyDraft {
  return { ...newAwardState(), draft_version: "draft-v1.1", survey_version: "survey-v1.1", catalog_version: "awards-v1.1", rules_version: "result-v1.1",
    draft_id: crypto.randomUUID(), survey: { ...EMPTY_SURVEY }, current_question: 0, current_screen: "survey", updated_at: new Date(now).toISOString() };
}
export function restoreSurveyDraft(raw: string | null, now = Date.now()): DraftLoad {
  if (raw === null) return { draft: null, notice: "", canPersist: true };
  const invalid = { draft: null, notice: "초안을 불러오지 못했어요. 기존 내용을 보존하며 이번 작성은 현재 창에서만 이어집니다. 새로고침하면 답변을 잃을 수 있어요.", canPersist: false };
  try {
    if (raw.length > 65536) return invalid;
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid;
    if (value.draft_version !== "draft-v1.1" || value.survey_version !== "survey-v1.1"
      || value.catalog_version !== "awards-v1.1" || value.rules_version !== "result-v1.1") {
      return { ...invalid, notice: "다른 버전의 초안은 변환하지 않고 보존했어요. 이번 작성은 현재 창에서만 진행되며 새로고침하면 답변을 잃을 수 있어요." };
    }
    if (typeof value.draft_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.draft_id)
      || !Number.isInteger(value.current_question) || value.current_question < 0 || value.current_question > 5
      || !["survey", "awards", "category", "review", "result"].includes(value.current_screen)
      || (["awards", "category", "review"].includes(value.current_screen) && value.current_question !== 5)
      || typeof value.updated_at !== "string" || !Number.isFinite(Date.parse(value.updated_at))
      || new Date(value.updated_at).toISOString() !== value.updated_at
      || !value.survey || typeof value.survey !== "object" || Array.isArray(value.survey)
      || Object.keys(value.survey).length !== 6
      || !QUESTIONS.every(q => Object.hasOwn(value.survey, q.id) && validAnswer(q.id, value.survey[q.id]))) return invalid;
    if (now - Date.parse(value.updated_at) >= DRAFT_TTL) {
      return { draft: null, notice: "마지막 수정 후 7일이 지나 초안이 만료됐어요. 새 영화제를 시작해 주세요.", canPersist: true };
    }
    const awards = restoreAwards(value);
    return { draft: { ...awards.state, draft_version: value.draft_version, survey_version: value.survey_version, catalog_version: value.catalog_version,
      rules_version: value.rules_version, draft_id: value.draft_id, survey: Object.fromEntries(QUESTIONS.map(q => [q.id, value.survey[q.id]])) as Survey,
      current_question: value.current_question, current_screen: value.current_screen, updated_at: value.updated_at }, notice: awards.repaired ? "후보 목록을 복구했어요. 답변과 수상작은 유지됩니다." : "", canPersist: true };
  } catch { return invalid; }
}
export function readSurveyDraft(storage: Pick<Storage, "getItem">, now = Date.now()): DraftLoad {
  try { return restoreSurveyDraft(storage.getItem(DRAFT_KEY), now); }
  catch { return { draft: null, notice: MEMORY_NOTICE, canPersist: false }; }
}
export function writeSurveyDraft(storage: Pick<Storage, "setItem">, draft: SurveyDraft): boolean {
  try { storage.setItem(DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}
export function setAnswer(draft: SurveyDraft, id: QuestionId, answer: Answer): SurveyDraft {
  if (!validAnswer(id, answer)) throw new Error("INVALID_ANSWER");
  return { ...draft, survey: { ...draft.survey, [id]: answer }, current_screen: "survey", updated_at: new Date().toISOString() };
}
export function advanceSurvey(draft: SurveyDraft, skip = false): SurveyDraft {
  const id = QUESTIONS[draft.current_question].id;
  if (!skip && draft.survey[id] === null) throw new Error("ANSWER_REQUIRED");
  const next = skip ? setAnswer(draft, id, null) : draft;
  return { ...next, ...(next.current_question===5?{candidate_order:categoryRecord(id=>candidateOrder(id,Math.random,next.survey))}:{}), current_question: Math.min(5, next.current_question + 1),
    current_screen: next.current_question === 5 ? "awards" : "survey", updated_at: new Date().toISOString() };
}
