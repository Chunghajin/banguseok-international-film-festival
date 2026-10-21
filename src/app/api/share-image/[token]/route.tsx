import {ImageResponse} from 'next/og';
import ShareImageCard from '@/components/share-image-card';
import {g3Font,g3Poster} from '@/lib/g3-assets';
import {createShareImageHttp} from '@/lib/share-image-http';

export const runtime = 'nodejs';
export const maxDuration = 30;

const handle = createShareImageHttp({render:async snapshot=>{
  const [font,posters] = await Promise.all([g3Font(), Promise.all(snapshot.selections.map(movie=>g3Poster(movie.poster_path)))]);
  const image = new ImageResponse(<ShareImageCard snapshot={snapshot} posters={posters}/>, {
    width:1080, height:1920, fonts:[{name:'G3Nanum',data:font,weight:400,style:'normal'}],
  });
  // Consume the stream so font/WASM failures return JSON 503, never a partial PNG 200.
  return image.arrayBuffer();
}});

export async function GET(request:Request,{params}:{params:Promise<{token:string}>}) {
  return handle(request,(await params).token);
}

// Next's implicit HEAD would run the expensive renderer.
export function HEAD() { return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'private, no-store'}}); }
