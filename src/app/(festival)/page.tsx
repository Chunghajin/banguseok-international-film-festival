import DraftActions from "@/components/draft-actions";

export default function Home() {
  return <main id="main-content" className="landing">
    <section className="landing-intro" aria-labelledby="festival-title">
      <div className="edition-line"><span>THE FESTIVAL OF ONE</span><span>나 혼자 여는 국제영화제</span></div>
      <p className="english-name">BANGUSEOK<br />International Film Festival</p>
      <h1 id="festival-title" className="hero-title">심사위원 만장일치.<br /><span className="crayon-underline">심사위원 1명.</span></h1>
      <p className="hero-description">지금까지 본 영화로,<br />당신의 영화제를 열어 보세요.</p>
      <DraftActions />
    </section>
    <section className="festival-example" aria-labelledby="example-title">
      <div className="example-heading"><h2 id="example-title">당신의 취향이 공식 기록이 되는 순간.</h2><span className="sample-mark">예시</span></div>
      <div className="sample-program">
        <p className="program-kicker">한 사람의 만장일치로 선정되었습니다.</p>
        <div className="sample-award"><span>심사위원장 대상</span><strong>쇼생크 탈출</strong><span>1994</span></div>
        <div className="sample-special"><div className="jury-stamp" aria-hidden="true">심사위원<br /><b>1명</b></div>
          <div><p className="program-kicker">집행위원장 특별상</p><h3>평점 협의상</h3>
            <p>심사위원 정원은 한 명입니다. 자문위원의 출석 여부는 별도 집계하지 않았습니다.</p></div>
        </div>
        <p className="example-note">결과지의 일부를 보여 주는 예시입니다.</p>
      </div>
    </section>
    <section className="festival-how" aria-label="영화제 개최 순서">
      <p><span>01</span>영화적 자아를 신고하고</p><p><span>02</span>기억에 남은 수상작을 고르고</p><p><span>03</span>나만의 영화제를 남기세요.</p>
    </section>
    <details className="storage-details"><summary>초안 저장·개인정보 안내</summary>
      <p>작성 중인 답변은 이 브라우저에만 임시 저장됩니다. 마지막 수정 후 7일이 지나면 만료되며, 브라우저 데이터를 지우면 초안도 사라집니다.</p>
      <p>이번 단계의 설문 답변은 서버에 전송되지 않습니다. 선정한 영화도 로컬 초안에 보관됩니다. 결과 저장·공유 기능은 아직 준비 중입니다.</p>
    </details>
  </main>;
}
