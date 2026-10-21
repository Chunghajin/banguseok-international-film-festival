"use client";

import { useEffect, useRef, useState } from "react";
import G3Card from "@/components/g3-card";
import { G3_CASES, G3_MOVIES, type G3Case } from "@/lib/g3-fixture";

export default function Probe() {
  const [mode, setMode] = useState<G3Case>("posters");
  const [count, setCount] = useState(3);
  const [failed, setFailed] = useState<number[]>([]);
  const [message, setMessage] = useState("HTML은 PNG와 독립적으로 표시됩니다.");
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState<string | null>(null);
  const [scale, setScale] = useState(0.3);
  const frame = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 1080));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);

  async function generate() {
    const requestId = ++sequence.current;
    setDownload(null);
    setBusy(true); setMessage("서버에서 폰트·포스터 로딩과 PNG 변환을 기다리는 중…");
    try {
      const response = await fetch(`/api/dev/png?${new URLSearchParams({ mode, count: String(count) })}`);
      if (!response.ok) throw new Error("PNG_FAILED");
      const blob = await response.blob();
      if (blob.type !== "image/png") throw new Error("INVALID_IMAGE");
      if (requestId !== sequence.current) return;
      setDownload(URL.createObjectURL(blob));
      setMessage(`1080×1920 PNG 준비 완료 · ${blob.size.toLocaleString()} bytes`);
    } catch { if (requestId === sequence.current) setMessage("PNG 생성 실패. 아래 HTML 화면은 계속 사용할 수 있어요."); }
    finally { if (requestId === sequence.current) setBusy(false); }
  }
  const posters = G3_MOVIES.map((movie, index) => mode === "text" || mode === "missing" || failed.includes(index)
    ? null : `https://image.tmdb.org/t/p/w500${mode === "poster-error" ? "/g3-deliberately-missing-image.jpg" : movie.poster_path}`);
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <label>시험 조건 <select value={mode} disabled={busy} className="min-h-11 border px-2"
        onChange={event => { setMode(event.target.value as G3Case); setFailed([]); setDownload(null); setMessage("조건을 바꿨어요. PNG를 다시 생성해 주세요."); }}>
        {G3_CASES.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>작품 수 <select value={count} disabled={busy} className="min-h-11 border px-2" onChange={event => { setCount(Number(event.target.value)); setDownload(null); setMessage("조건을 바꿨어요. PNG를 다시 생성해 주세요."); }}>
        {[3,4,5,6].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <button type="button" className="min-h-11 border px-4" disabled={busy} onClick={generate}>PNG 만들기</button>
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {download && <div className="flex gap-4">
      <a href={download} download="banguseok-g3.png" className="inline-flex min-h-11 items-center underline">PNG 다운로드</a>
      <a href={download} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">이미지 열기</a>
    </div>}
    <div ref={frame} className="w-full" style={{ height: 1920 * scale }} aria-label="PNG와 독립적인 HTML 시험 결과">
      <div style={{ width: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <G3Card posters={posters} count={count} onPosterError={index => setFailed(previous => previous.includes(index) ? previous : [...previous, index])} />
      </div>
    </div>
  </div>;
}
