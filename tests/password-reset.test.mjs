import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('dist/password-reset.js','utf8');
function fixture(hash,{invalid=false}={}){
 const nodes=new Map(),calls=[];let submit;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,innerHTML:'',textContent:'',addEventListener:(event,fn)=>{submit=fn}});return nodes.get(id)};
 const auth={setSession:async()=>{calls.push('session');return {error:invalid?Error():null}},getUser:async()=>({data:{user:{email:'test@example.com'}}}),updateUser:async()=>{calls.push('update');return {}},signOut:async()=>{calls.push('signout');return {}}};
 const context={window:{supabase:{createClient:(_url,_key,opts)=>{assert.equal(opts.auth.persistSession,false);return {auth}}}},document:{getElementById:node},location:{hash,pathname:'/'},history:{replaceState:()=>calls.push('scrub')},URLSearchParams,FormData:class{constructor(form){this.data=form.data}get(k){return this.data[k]}}};
 vm.runInNewContext(source,context);
 return {calls,nodes,run:()=>context.window.FAMILY_RESET.handle({}),submit:async(password,confirm)=>{const button={disabled:false};await submit({preventDefault(){},target:{data:{password,confirm},querySelector:()=>button,reset(){calls.push('clear')}}})}};
}
test('normal password login is not intercepted',async()=>{const f=fixture('');assert.equal(await f.run(),false);assert.deepEqual(f.calls,[])});
test('expired link is scrubbed and cannot update a password',async()=>{const f=fixture('#error=access_denied&error_code=otp_expired');assert.equal(await f.run(),true);assert.deepEqual(f.calls,['scrub']);assert.match(f.nodes.get('screen').innerHTML,/Link nicht mehr gültig/)});
test('invalid recovery session never shows password form',async()=>{const f=fixture('#type=recovery&access_token=test&refresh_token=test',{invalid:true});await f.run();assert.match(f.nodes.get('screen').innerHTML,/Link nicht mehr gültig/);assert.ok(!f.calls.includes('update'))});
test('recovery validates confirmation, changes password and signs out',async()=>{const f=fixture('#type=recovery&access_token=test&refresh_token=test');await f.run();assert.match(f.nodes.get('screen').innerHTML,/Neues Passwort festlegen/);await f.submit('long-test-password','different-password');assert.ok(!f.calls.includes('update'));await f.submit('long-test-password','long-test-password');assert.deepEqual(f.calls,['scrub','session','update','clear','signout']);assert.match(f.nodes.get('screen').innerHTML,/Passwort geändert/)});
test('invitation opens first-password screen and returns to password login after setup',async()=>{const f=fixture('#type=invite&access_token=test&refresh_token=test');assert.equal(await f.run(),true);assert.match(f.nodes.get('screen').innerHTML,/Dein Passwort festlegen/);await f.submit('long-test-password','long-test-password');assert.deepEqual(f.calls,['scrub','session','update','clear','signout']);assert.match(f.nodes.get('screen').innerHTML,/Zugang eingerichtet/)});
test('invalid invitation cannot set a password',async()=>{const f=fixture('#type=invite&access_token=test&refresh_token=test',{invalid:true});await f.run();assert.match(f.nodes.get('screen').innerHTML,/Link nicht mehr gültig/);assert.ok(!f.calls.includes('update'))});
