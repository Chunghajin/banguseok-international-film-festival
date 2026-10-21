import assert from "node:assert/strict";
import test from "node:test";
import { createTmdbClient, normalizeMovie, posterUrl, movieErrorResponse, MovieError } from "../src/lib/tmdb.ts";

const raw = {id:1,title:"한국어 제목",original_title:"Original title",release_date:"2020-02-01",poster_path:"/poster.jpg",adult:false};
const token="offline-token-never-return";
test("TMDB search encodes Korean/English, uses server header, ko-KR and adult=false; returns allowlist",async()=>{
  for(const q of [" 기생충 ","The Host","괴"]){
    const client=createTmdbClient({token,fetcher:async(url,options)=>{
      assert.equal(url.origin,"https://api.themoviedb.org");
      assert.equal(url.searchParams.get("query"),q.trim());
      assert.equal(url.searchParams.get("language"),"ko-KR");
      assert.equal(url.searchParams.get("include_adult"),"false");
      assert.ok(!url.href.includes(token));
      assert.equal(options.headers.Authorization,`Bearer ${token}`);
      assert.equal(options.redirect,"error");
      assert.equal(options.cache,"no-store");
      return Response.json({results:[{...raw,private_field:token}],total_pages:8});
    }});
    const result=await client.search(q);
    assert.deepEqual(result,{items:[normalizeMovie(raw)],page:1,has_more:true});
    assert.ok(!JSON.stringify(result).includes(token));
  }
});
test("missing translated title/date/poster uses original title and null fields",()=>{
  assert.deepEqual(normalizeMovie({...raw,title:" ",release_date:"",poster_path:null}),{
    tmdb_id:1,title:"Original title",original_title:"Original title",release_year:null,poster_path:null,poster_url:null,
  });
});
test("poster URL accepts only a TMDB relative image path",()=>{
  assert.equal(posterUrl("/abc_123-X.jpg"),"https://image.tmdb.org/t/p/w500/abc_123-X.jpg");
  for(const path of [null,"","https://evil.test/x.jpg","//evil.test/x.jpg","/../x.jpg","/%2e%2e/x.jpg","/x.svg","/x.jpg?token=secret"]){
    assert.equal(posterUrl(path),null);
    assert.equal(normalizeMovie({...raw,poster_path:path}).poster_path,null);
  }
});
test("empty/long search, invalid page and invalid ID fail before external request",async()=>{
  let calls=0;
  const client=createTmdbClient({token,fetcher:async()=>{calls++;throw Error("must not fetch");}});
  for(const query of ["","  ","가".repeat(101)]) await assert.rejects(()=>client.search(query),error=>error.status===400);
  for(const page of ["0","6","1.2","01","foo"]) await assert.rejects(()=>client.search("기생충",page),error=>error.code==="INVALID_PAGE");
  for(const id of ["0","-1","1.2","abc","1?api_key=x","2147483648"]) await assert.rejects(()=>client.detail(id),error=>error.status===400);
  assert.equal(calls,0);
});
test("zero results, maximum 20 items and page 5 cap",async()=>{
  const empty=createTmdbClient({token,fetcher:async()=>Response.json({results:[],total_pages:0})});
  assert.deepEqual(await empty.search("없는영화"),{items:[],page:1,has_more:false});
  const many=createTmdbClient({token,fetcher:async()=>Response.json({results:Array(22).fill(raw),total_pages:10})});
  const result=await many.search("영화","5");
  assert.equal(result.items.length,20); assert.equal(result.has_more,false);
});
test("details have the requested ID, ko-KR and a safe schema; adult films excluded",async()=>{
  const client=createTmdbClient({token,fetcher:async(url)=>{
    assert.equal(url.pathname,"/3/movie/1");assert.equal(url.searchParams.get("language"),"ko-KR");
    return Response.json(raw);
  }});
  assert.deepEqual(await client.detail("1"),normalizeMovie(raw));
  const adult=createTmdbClient({token,fetcher:async()=>Response.json({...raw,adult:true})});
  await assert.rejects(()=>adult.detail("1"),error=>error.status===404);
  const mismatch=createTmdbClient({token,fetcher:async()=>Response.json({...raw,id:2})});
  await assert.rejects(()=>mismatch.detail("1"),error=>error.code==="TMDB_BAD_RESPONSE");
});
test("upstream auth/404/429/500 and network/timeout are safe and never automatically retried",async()=>{
  for(const [status,code,outStatus] of [[401,"TMDB_AUTH_FAILED",503],[403,"TMDB_AUTH_FAILED",503],
    [404,"MOVIE_NOT_FOUND",404],[429,"TMDB_RATE_LIMITED",429],[500,"TMDB_UPSTREAM_ERROR",502]]){
    let calls=0;
    const client=createTmdbClient({token,fetcher:async()=>{calls++;return Response.json({status_message:token},{status});}});
    await assert.rejects(()=>client.detail("1"),asyncError=>{
      assert.equal(asyncError.code,code);assert.equal(asyncError.status,outStatus);
      assert.ok(!asyncError.message.includes(token));return true;
    });
    assert.equal(calls,1);
  }
  for(const [error,code] of [[new TypeError(token),"TMDB_NETWORK_ERROR"],[new DOMException(token,"TimeoutError"),"TMDB_TIMEOUT"]]){
    const client=createTmdbClient({token,fetcher:async()=>{throw error;}});
    await assert.rejects(()=>client.detail("1"),err=>err.code===code&&!err.message.includes(token));
  }
});
test("malformed JSON/schema and missing credentials fail safely",async()=>{
  for(const body of ["not json",JSON.stringify({results:null,total_pages:1})]){
    const client=createTmdbClient({token,fetcher:async()=>new Response(body)});
    await assert.rejects(()=>client.search("영화"),error=>error.code==="TMDB_BAD_RESPONSE");
  }
  const client=createTmdbClient({token:"",fetcher:async()=>{throw Error("must not fetch");}});
  await assert.rejects(()=>client.detail("1"),error=>error.code==="TMDB_NOT_CONFIGURED");
});
test("a stalled external request is aborted by the real 5-second deadline",async()=>{
  const keepAlive=setTimeout(()=>{},6500);
  let calls=0;
  const client=createTmdbClient({token,fetcher:async(_url,options)=>{
    calls++;
    return new Promise((_resolve,reject)=>options.signal.addEventListener("abort",()=>reject(options.signal.reason),{once:true}));
  }});
  try {
    await assert.rejects(()=>client.detail("1"),error=>error.code==="TMDB_TIMEOUT"&&error.status===503);
    assert.equal(calls,1);
  } finally {clearTimeout(keepAlive);}
});
test("API errors contain only code/message/retryable; never raw upstream exceptions",async()=>{
  const response=movieErrorResponse(new TypeError(token));
  assert.equal(response.status,503);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  const data=await response.json();
  assert.deepEqual(Object.keys(data).sort(),["code","message","retryable"]);
  assert.ok(!JSON.stringify(data).includes(token));
  assert.equal(movieErrorResponse(new MovieError(429,"TMDB_RATE_LIMITED","잠시 후",true)).status,429);
});
