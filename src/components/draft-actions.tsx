"use client";
import { useRouter } from "next/navigation";
import { startDraft, useSurveyDraft } from "@/lib/survey-store";
export default function DraftActions() {
  const state = useSurveyDraft();
  const router = useRouter();
  function start() {
    if (state.draft && !window.confirm("작성 중인 로컬 초안을 버리고 새로 시작할까요? 저장된 영화제는 삭제되지 않습니다.")) return;
    startDraft(); router.push("/create/survey");
  }
  return <div id="my-draft" className="entry-actions">
    <h2 className="sr-only">내 영화제</h2>
    {state.notice && <p className="storage-notice" role="status">{state.notice}</p>}
    {state.draft ? <>
      <p className="draft-caption">이 브라우저에 작성 중인 초안이 있어요.</p>
      <button className="primary-action" onClick={() => router.push(state.draft?.current_screen === "result" ? "/create/result" : state.draft?.current_screen === "review" ? "/create/review" : state.draft?.current_screen === "category" ? `/create/awards/${state.draft.current_category}` : state.draft?.current_screen === "awards" ? "/create/awards" : "/create/survey")}>이어서 개최하기 <span aria-hidden="true">↗</span></button>
      <button className="text-action" onClick={start}>새로 개최하기</button>
    </> : <button className="primary-action" onClick={start} disabled={!state.ready}>내 영화제 개최하기 <span aria-hidden="true">↗</span></button>}
    <p className="entry-help">6개 부문 중 3개만 골라도 됩니다.</p>
  </div>;
}
