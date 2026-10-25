import TmdbCredits from '@/components/tmdb-credits';
import Link from 'next/link';
import '../(festival)/festival.css';
import '../(festival)/de-design.css';
export default function PublicLayout({children}:{children:React.ReactNode}){return <div className="festival"><a className="skip-content" href="#main-content">본문으로 바로가기</a><header className="festival-header"><Link href="/" className="wordmark" aria-label="방국제 홈">방국제<span>BANGUSEOK<br/>International Film Festival</span></Link></header>{children}<footer className="festival-footer"><span>BANGUSEOK</span><span>심사위원 만장일치. 심사위원 1명.</span><TmdbCredits /></footer></div>;}
