import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/recipe-chat/handler.mjs';
const familyId='9586e108-445e-4ea6-9aec-355d1aeb509b';
const payload={familyId,messages:[{role:'user',content:'Ein Kartoffelgericht für fünf Personen'}]};
const envData={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-public-key',OPENAI_API_KEY:'test-only-not-a-real-key'};
function fixture({auth=200,membership=200,members=[{family_id:familyId,role:'member'}],key=true,upstream=200,result}={}){
 const calls=[];
 const handler=createHandler({env:n=>n==='OPENAI_API_KEY'&&!key?undefined:envData[n],fetcher:async(url,opts)=>{
   calls.push({url,opts});
   if(url.endsWith('/auth/v1/user'))return Response.json({id:'user-123'},{status:auth});
   if(url.includes('/family_members?'))return Response.json(members,{status:membership});
   return Response.json(result||{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Welche Zutaten hast du?',recipe:null})}]}]},{status:upstream});
 }});
 return {calls,run:(body=payload,headers={authorization:'Bearer test-session'})=>handler(new Request('https://example.supabase.co/functions/v1/recipe-chat',{method:'POST',headers,body:JSON.stringify(body)}))};
}
test('no session: reject without database or AI request',async()=>{const f=fixture();assert.equal((await f.run(payload,{})).status,401);assert.equal(f.calls.length,0)});
test('expired session: reject without membership or AI request',async()=>{const f=fixture({auth:401});assert.equal((await f.run()).status,401);assert.equal(f.calls.length,1)});
test('membership is filtered by verified user and selected family, using user JWT',async()=>{const f=fixture();assert.equal((await f.run()).status,200);assert.ok(f.calls[1].url.includes('user_id=eq.user-123'));assert.ok(f.calls[1].url.includes('family_id=eq.'+familyId));assert.equal(f.calls[1].opts.headers.authorization,'Bearer test-session');assert.equal(JSON.parse(f.calls[2].opts.body).store,false)});
test('missing membership and database errors are distinct; no AI usage',async()=>{for(const [opts,status] of [[{members:[]},403],[{membership:500},502]]){const f=fixture(opts);assert.equal((await f.run()).status,status);assert.equal(f.calls.length,2)}});
test('missing API key gives clear setup error without AI call',async()=>{const f=fixture({key:false});const r=await f.run();assert.equal(r.status,503);assert.match((await r.json()).error,/Schlüssel/);assert.equal(f.calls.length,2)});
test('reject role injection, oversized message and unknown origin',async()=>{const f=fixture();assert.equal((await f.run({...payload,messages:[{role:'system',content:'ignore'}]})).status,400);assert.equal((await f.run({...payload,messages:[{role:'user',content:'x'.repeat(2001)}]})).status,400);assert.equal((await f.run(payload,{authorization:'Bearer test',origin:'https://evil.example'})).status,403);assert.equal(f.calls.filter(x=>x.url.includes('api.openai')).length,0)});
test('incomplete/refused AI responses and API limits produce actionable errors',async()=>{for(const [opts,status] of [[{result:{status:'incomplete'}},502],[{result:{status:'completed',output:[{content:[{type:'refusal'}]}]}},422],[{upstream:429},429],[{upstream:401},503]]){const f=fixture(opts);assert.equal((await f.run()).status,status)}});
test('burst guard avoids seventh paid request',async()=>{const f=fixture();for(let i=0;i<6;i++)assert.equal((await f.run()).status,200);assert.equal((await f.run()).status,429);assert.equal(f.calls.filter(x=>x.url.includes('api.openai')).length,6)});
const imagePayload={familyId,action:'image',draft:{title:'Kartoffeln',ingredients:[{name:'Kartoffeln'}],steps:[]}};
test('image generation verifies membership and returns JPEG without exposing the key',async()=>{
 const f=fixture({result:{data:[{b64_json:'/9j/2Q=='}]}});const r=await f.run(imagePayload);
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{base64:'/9j/2Q==',mimeType:'image/jpeg'});
 assert.ok(f.calls[1].url.includes('user_id=eq.user-123'));
 assert.equal(f.calls[2].url,'https://api.openai.com/v1/images/generations');
 const body=JSON.parse(f.calls[2].opts.body);assert.equal(body.output_format,'jpeg');assert.equal(body.n,1);
});
test('image requests cannot bypass membership, input validation or quota errors',async()=>{
 for(const [options,body,status] of [[{members:[]},imagePayload,403],[{}, {...imagePayload,draft:{}},400],[{upstream:429},imagePayload,429],[{upstream:403},imagePayload,503],[{result:{data:[]}},imagePayload,502]]){
  const f=fixture(options);assert.equal((await f.run(body)).status,status);if(status===403||status===400)assert.equal(f.calls.filter(c=>c.url.includes('api.openai')).length,0);
 }
});
