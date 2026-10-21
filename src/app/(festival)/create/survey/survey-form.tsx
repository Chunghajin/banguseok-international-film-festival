"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_SURVEY, QUESTIONS } from "@/lib/survey";
import { advanceSurvey, newSurveyDraft, setAnswer } from "@/lib/survey-draft";
import { saveDraft, useSurveyDraft } from "@/lib/survey-store";
export default function SurveyForm() {
  const state = useSurveyDraft();
  const router = useRouter();
  const index = state.draft?.current_question ?? 0;
  const question = QUESTIONS[index];
  const answers = state.draft?.survey ?? EMPTY_SURVEY;
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRadio = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.ready) { heading.current?.focus(); window.scrollTo(0, 0); } }, [index, state.ready]);
  function next(skip = false) {
    if (!skip && answers[question.id] === null) {
      setError("답변을 선택하거나 ‘이 질문 건너뛰기’를 눌러 주세요."); firstRadio.current?.focus(); return;
    }
    const draft = advanceSurvey(state.draft ?? newSurveyDraft(), skip);
    setError(""); saveDraft(draft);
    if (draft.current_screen === "awards") router.push("/create/awards");
  }
  function previous() {
    setError("");
    if (index === 0) { router.push("/"); return; }
    saveDraft({ ...state.draft!, current_question: index - 1, current_screen: "survey", updated_at: new Date().toISOString() });
  }
  return <main id="main-content" className="survey-page">
    <div className="survey-topline"><button className="text-action" onClick={previous}>← 이전</button><p>영화적 자아 신고서 <span>{index + 1}/6</span></p></div>
    <progress className="survey-progress" value={index + 1} max={6} aria-label="현재 설문 문항" />
    {state.notice && <p className="storage-notice" role="status">{state.notice}</p>}
    {!state.ready ? <p role="status">작성 중인 초안을 확인하고 있어요.</p> : <form onSubmit={event => { event.preventDefault(); next(); }} noValidate>
      <p className="question-number" aria-hidden="true">QUESTION {String(index + 1).padStart(2, "0")}</p>
      <fieldset className="survey-fieldset" aria-invalid={Boolean(error)} aria-describedby={`survey-hint${error ? " survey-error" : ""}`}>
        <legend><h1 ref={heading} tabIndex={-1} className="question-title">{question.text}</h1></legend>
        <div className="survey-options">{question.options.map((option, optionIndex) => <label key={`${question.id}-${option.value}`} className="survey-option">
          <input ref={optionIndex === 0 ? firstRadio : undefined} type="radio" name={question.id} value={option.value} checked={answers[question.id] === option.value}
            onChange={() => { setError(""); saveDraft(setAnswer(state.draft ?? newSurveyDraft(), question.id, option.value)); }} />
          <span>{option.label}</span><span className="selected-note" aria-hidden="true">선택됨</span>
        </label>)}</div>
      </fieldset>
      <p id="survey-hint" className="survey-hint">{question.id === "q6" ? "올해 관람량과 관계없이, 예전에 본 영화로도 참여할 수 있어요." : "답변은 특별상의 농담을 고르는 데 사용합니다."}</p>
      {error && <p id="survey-error" className="form-error" role="alert">{error}</p>}
      <div className="survey-actions"><button className="primary-action" type="submit">{index === 5 ? "설문 마치기" : "다음"}<span aria-hidden="true">→</span></button>
        <button className="text-action skip-question" type="button" onClick={() => next(true)}>이 질문 건너뛰기</button></div>
      <p className="save-caption">{state.canPersist ? "답변과 진행 위치는 이 브라우저에 임시 저장됩니다." : "현재 창에서만 임시로 이어집니다. 새로고침에 주의해 주세요."}</p>
    </form>}
    <Link className="return-home" href="/">방국제 입구로</Link>
  </main>;
}
