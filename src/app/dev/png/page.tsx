import { notFound } from "next/navigation";
import { g3Enabled } from "@/lib/g3-fixture";
import Probe from "./probe";

export const dynamic = "force-dynamic";

export default function PngProbePage() {
  if (!g3Enabled()) notFound();
  return <main className="mx-auto max-w-[720px] space-y-5 px-4 py-8">
    <style>{`@font-face { font-family: G3Nanum; src: url('/fonts/NanumGothic-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }`}</style>
    <h1 className="text-2xl">G3 한글·포스터 PNG 검증</h1>
    <p>기술 검증용 HTML입니다. 아래 화면과 PNG는 같은 JSX를 사용합니다. 이미지 생성 실패는 HTML을 지우지 않습니다.</p>
    <Probe />
  </main>;
}
