// Synthetic T02 fixture: IDs identify test records only; no TMDB validation is claimed.
export function fixture(draftId) {
  return {
    p_draft: draftId,
    p_nickname: "G1검증",
    p_survey: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: "unknown" },
    p_selections: ["grand", "lifetime", "once"].map((category_id, index) => ({
      category_id, tmdb_id: index + 1, title: `G1 합성 작품 ${index + 1}`,
      original_title: null, release_year: null, poster_path: null,
    })),
    p_result: {
      special_award_id: "chair", variant_id: "H2", special_award_title: "단독 개최 공로상",
      award_sentence: "심사, 선정, 시상을 한 분이 담당하셨습니다. 회의 정족수는 처음부터 충족되었습니다.",
      selection_sentence: "최고의 영예는 〈G1 합성 작품 1〉에게 돌아갔습니다. 반대 의견은 없었습니다.",
      volume_sentence: null, answered_count: 5, evidence_ids: [],
    },
    p_survey_version: "survey-v1.1", p_catalog_version: "awards-v1.1", p_rules_version: "result-v1.1",
  };
}
