import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { QUESTIONS, FREQUENCY, AGREEMENT, VOLUME, validAnswer } from "../src/lib/survey.ts";
import { DRAFT_KEY, DRAFT_TTL, newSurveyDraft, restoreSurveyDraft, readSurveyDraft, writeSurveyDraft, setAnswer, advanceSurvey } from "../src/lib/survey-draft.ts";

test("six questions, their exact text and response mappings match SCREEN_CONTENT v1.1",async()=>{
  const spec=await readFile("docs/SCREEN_CONTENT.md","utf8");
  assert.equal(QUESTIONS.length,6);
  for(const question of QUESTIONS)assert.ok(spec.includes(question.text));
  for(const option of [...FREQUENCY,...AGREEMENT])assert.ok(spec.includes(`${option.label}${option.value}`));
  for(const option of VOLUME)assert.ok(spec.includes(`|${option.label}|${option.value}|`));
  assert.deepEqual(QUESTIONS.map(q=>q.id),["q1","q2","q3","q4","q5","q6"]);
  assert.equal(QUESTIONS[3].options,AGREEMENT);
  for(const i of [0,1,2,4])assert.equal(QUESTIONS[i].options,FREQUENCY);
  assert.deepEqual(FREQUENCY.map(o=>o.value),[4,3,2,1,0]);
});
test("zero and neutral are valid; null stays skipped; strings/floats/out-of-range fail",()=>{
  for(const value of [0,1,2,3,4,null])assert.ok(validAnswer("q1",value));
  for(const value of ["3",-1,5,2.5,undefined,false])assert.equal(validAnswer("q4",value),false);
  assert.ok(validAnswer("q6","fiftyone_to_hundred"));
  assert.ok(validAnswer("q6","hundredone_plus"));
  assert.equal(validAnswer("q6",0),false);
});
test("no default answer; next requires a response; zero advances; skip explicitly resets to null",()=>{
  const original=newSurveyDraft();
  assert.ok(Object.values(original.survey).every(value=>value===null));
  assert.throws(()=>advanceSurvey(original),/ANSWER_REQUIRED/);
  const zero=setAnswer(original,"q1",0);
  assert.equal(advanceSurvey(zero).current_question,1);
  assert.equal(advanceSurvey(zero,true).survey.q1,null);
  assert.equal(zero.survey.q1,0);
  assert.equal(original.survey.q1,null);
});
test("all six explicit skips are allowed, ending at awards entry without assigning scores",()=>{
  let draft=newSurveyDraft();
  for(let i=0;i<6;i++)draft=advanceSurvey(draft,true);
  assert.equal(draft.current_screen,"awards");assert.equal(draft.current_question,5);
  assert.ok(Object.values(draft.survey).every(value=>value===null));
  assert.equal(draft.result,undefined);
});
test("round-trip restores zero/null, response bins, current question and completed entry",()=>{
  const now=Date.UTC(2026,9,21);
  const draft={...newSurveyDraft(now),survey:{q1:0,q2:null,q3:2,q4:2,q5:4,q6:"fiftyone_to_hundred"},current_question:5};
  assert.deepEqual(restoreSurveyDraft(JSON.stringify(draft),now).draft,draft);
  const completed={...draft,current_screen:"awards",survey:{...draft.survey,q6:"hundredone_plus"}};
  assert.deepEqual(restoreSurveyDraft(JSON.stringify(completed),now).draft,completed);
});
test("seven-day expiry boundary is based on last modification",()=>{
  const now=Date.UTC(2026,9,21);const raw=JSON.stringify(newSurveyDraft(now));
  assert.ok(restoreSurveyDraft(raw,now+DRAFT_TTL-1).draft);
  const expired=restoreSurveyDraft(raw,now+DRAFT_TTL);
  assert.equal(expired.draft,null);assert.match(expired.notice,/7일/);assert.equal(expired.canPersist,true);
});
test("corrupt or incompatible storage is not converted or overwritten",()=>{
  const valid=newSurveyDraft();
  for(const raw of ["{broken","null",JSON.stringify({...valid,draft_version:"draft-v1.0"}),
    JSON.stringify({...valid,survey:{...valid.survey,q1:"3"}}),JSON.stringify({...valid,current_question:6}),
    JSON.stringify({...valid,current_screen:"awards",current_question:0}),JSON.stringify({...valid,updated_at:"yesterday"}),
    JSON.stringify({...valid,survey:{...valid.survey,q6:"fiftyone_plus"}})]){
    const storage={getItem:()=>raw,setItem:()=>assert.fail("must not write")};
    const result=readSurveyDraft(storage);assert.equal(result.draft,null);assert.equal(result.canPersist,false);assert.ok(result.notice);
  }
});
test("unavailable/quota-exhausted storage fails safely while memory draft still advances",()=>{
  const blocked={getItem:()=>{throw Error("blocked");},setItem:()=>{throw Error("quota");}};
  assert.equal(readSurveyDraft(blocked).canPersist,false);
  const draft=setAnswer(newSurveyDraft(),"q1",4);
  assert.equal(writeSurveyDraft(blocked,draft),false);
  assert.equal(advanceSurvey(draft).current_question,1);
});
test("new drafts replace only M1's key; auth/other drafts survive; unknown fields are not propagated",()=>{
  const map=new Map([["unrelated-auth","untouched"]]);
  const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
  const first=newSurveyDraft();writeSurveyDraft(storage,first);
  const second=newSurveyDraft();writeSurveyDraft(storage,second);
  assert.notEqual(first.draft_id,second.draft_id);
  assert.equal(readSurveyDraft(storage).draft.draft_id,second.draft_id);
  assert.equal(map.get("unrelated-auth"),"untouched");assert.equal(map.size,2);assert.ok(map.has(DRAFT_KEY));
  assert.equal(restoreSurveyDraft(JSON.stringify({...second,unknown:"do-not-copy"})).draft.unknown,undefined);
});
test("M1 text and action colours meet readable contrast on their actual CSS backgrounds",async()=>{
  const css=await readFile("src/app/(festival)/festival.css","utf8");
  const globals=await readFile("src/app/globals.css","utf8");
  function luminance(hex){return hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255)
    .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);}
  function contrast(a,b){const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(values[0]+.05)/(values[1]+.05);}
  const paper=globals.match(/background:\s*(#[a-f0-9]{6})/i)[1];
  const muted=css.match(/--festival-muted:\s*(#[a-f0-9]{6})/i)[1];
  const button=css.match(/\.primary-action\s*\{([^}]+)\}/)[1];
  const crimson=button.match(/background:\s*(#[a-f0-9]{6})/i)[1];
  assert.ok(contrast(muted,paper)>=4.5);assert.ok(contrast(crimson,"#ffffff")>=4.5);
});
