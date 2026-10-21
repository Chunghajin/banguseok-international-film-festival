import ManageFestival from './manage';
export const dynamic='force-dynamic';
export const metadata={title:'내 영화제 관리 — 방국제',robots:{index:false,follow:false}};
export default async function MyFestival({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ManageFestival id={id}/>;}
