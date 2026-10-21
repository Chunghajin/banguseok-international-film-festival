import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {CATEGORIES} from '../../src/lib/award-catalog.ts';
import {createTmdbClient} from '../../src/lib/tmdb.ts';
const client=createTmdbClient();const records=[];
try{
 const unique=[...new Map(CATEGORIES.flatMap(c=>c.groups.flat()).map(m=>[m.id,m])).values()];
 for(const expected of unique){
  const movie=await client.detail(String(expected.id));
  assert.equal(movie.tmdb_id,expected.id);
  assert.ok(movie.title);
  // The 2013 festival premiere differs from TMDB's 2014 release for Under the Skin.
  assert.equal(movie.release_year,expected.id===97370?2014:expected.year);
  records.push({editorial_title:expected.label,editorial_year:expected.year,...movie});
 }
 await writeFile('artifacts/m2/catalog-verified.json',JSON.stringify(records,null,2)+'\n');
 console.log(`PASS: actual TMDB ${records.length} unique films / 72 category slots, IDs and years. Titles/originals in artifact for review.`);
}catch {console.error(`FAIL: catalog verification at item ${records.length+1}; no secrets or raw errors printed.`);process.exitCode=1;}
