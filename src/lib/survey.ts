export const FREQUENCY = [
  { label: "매우 자주 있다", value: 4 }, { label: "자주 있다", value: 3 },
  { label: "가끔 있다", value: 2 }, { label: "드물다", value: 1 }, { label: "전혀 없다", value: 0 },
] as const;
export const AGREEMENT = [
  { label: "매우 그렇다", value: 4 }, { label: "그렇다", value: 3 },
  { label: "보통이다", value: 2 }, { label: "그렇지 않다", value: 1 }, { label: "전혀 그렇지 않다", value: 0 },
] as const;
export const VOLUME = [
  { label: "0편", value: "zero" }, { label: "1~5편", value: "one_to_five" },
  { label: "6~20편", value: "six_to_twenty" }, { label: "21~50편", value: "twentyone_to_fifty" },
  { label: "51~100편", value: "fiftyone_to_hundred" }, { label: "101편 이상", value: "hundredone_plus" },
  { label: "잘 모르겠다", value: "unknown" },
] as const;
export const QUESTIONS = [
  { id: "q1", text: "내 별점을 정해 놓고, 이동진 평론가의 별점을 확인한 뒤 슬그머니 고친 경험은 얼마나 있나요?", options: FREQUENCY },
  { id: "q2", text: "친구에게 인생 영화를 추천한 뒤, 영화보다 친구 표정을 더 열심히 본 경험은 얼마나 있나요?", options: FREQUENCY },
  { id: "q3", text: "영화가 끝난 뒤 잘 모르겠는데, 옆 사람을 따라 심각하게 고개를 끄덕인 경험은 얼마나 있나요?", options: FREQUENCY },
  { id: "q4", text: "나는 엔딩 크레딧이 끝날 때까지 앉아 있는 편이다.", options: AGREEMENT },
  { id: "q5", text: "좋아하는 영화인데, 다른 사람이 내 인생 영화를 물으면 잠깐 숨긴 경험은 얼마나 있나요?", options: FREQUENCY },
  { id: "q6", text: "올해 지금까지 본 영화는 몇 편인가요? 극장·OTT를 합치고, 같은 영화를 다시 본 것은 한 편으로 세어 주세요.", options: VOLUME },
] as const;
export type QuestionId = typeof QUESTIONS[number]["id"];
export type Volume = typeof VOLUME[number]["value"];
export type Answer = number | Volume | null;
export type Survey = { q1: number | null; q2: number | null; q3: number | null; q4: number | null; q5: number | null; q6: Volume | null };
export const EMPTY_SURVEY: Survey = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null };
export function validAnswer(id: QuestionId, answer: unknown): answer is Answer {
  return answer === null || (id === "q6" ? VOLUME.some(option => option.value === answer)
    : typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer <= 4);
}
