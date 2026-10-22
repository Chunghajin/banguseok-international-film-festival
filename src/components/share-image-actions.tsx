'use client';
import {useEffect,useRef,useState} from 'react';

export default function ShareImageActions({token}:{token:string}) {
  const [file,setFile] = useState<File|null>(null), [url,setUrl] = useState(''), [busy,setBusy] = useState(false);
  const [message,setMessage] = useState(''), [canShare,setCanShare] = useState(false);
  const lock = useRef(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function generate() {
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setFile(null);setUrl('');setCanShare(false);
    try {
      const response = await fetch(`/api/share-image/${token}`,{cache:'no-store',redirect:'error'});
      if(!response.ok) {
        const body = await response.json().catch(()=>null);
        throw new Error(body?.message??'이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
      if(response.headers.get('content-type')!=='image/png')throw new Error('이미지 응답을 확인하지 못했어요.');
      const image = new File([await response.blob()],'banguseok-festival.png',{type:'image/png'});
      setFile(image);setUrl(URL.createObjectURL(image));
      let supported=false;
      try {supported=Boolean(typeof navigator.share==='function'&&navigator.canShare?.({files:[image]}));}
      catch { /* Capability checks can be denied independently of downloading. */ }
      setCanShare(supported);
      setMessage('이미지가 준비됐어요. PNG를 저장하거나 공유해 주세요.');
    } catch(error) {setMessage(error instanceof Error?error.message:'이미지를 만들지 못했어요.');}
    finally {lock.current=false;setBusy(false);}
  }
  async function share() {
    if(!file||lock.current)return;lock.current=true;setBusy(true);
    try {await navigator.share({files:[file],title:'방구석국제영화제'});setMessage('공유를 마쳤어요.');}
    catch(error) {setMessage(error instanceof Error&&error.name==='AbortError'?'공유를 취소했어요. PNG는 계속 저장할 수 있어요.':'공유하지 못했어요. PNG 다운로드나 이미지 열기를 이용해 주세요.');}
    finally {lock.current=false;setBusy(false);}
  }
  return <section className="share-management share-image-actions" aria-label="공유 이미지">
    <h2>수상 결과 이미지</h2><p>공개된 결과를 1080×1920 PNG로 만듭니다. 저장한 이미지는 공개 중단 후에도 남습니다.</p>
    <button className="primary-action" disabled={busy} onClick={generate}>{busy?'처리 중…':file?'PNG 다시 만들기':'공유 이미지 만들기'}</button>
    <div className="share-image-buttons">
    {url&&<><a className="download-image" href={url} download="banguseok-festival.png">PNG 다운로드</a><a className="text-action" href={url} target="_blank" rel="noopener noreferrer">이미지 열기 ↗</a></>}
    {file&&canShare&&<button className="download-image" disabled={busy} onClick={share}>이미지 공유</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
