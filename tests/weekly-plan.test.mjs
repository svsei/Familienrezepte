import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/weekly-plan.js','utf8');
function setup(){const context={window:{},document:{addEventListener(){}}};vm.runInNewContext(source,context);return context.window.WEEK_PLAN;}
test('weeks start on Monday and date navigation crosses months and years',()=>{const {monday,shift}=setup().dates;assert.equal(monday('2026-11-15'),'2026-11-09');assert.equal(monday('2026-11-09'),'2026-11-09');assert.equal(monday('2027-01-01'),'2026-12-28');assert.equal(shift('2026-12-28',7),'2027-01-04');assert.equal(shift('2026-03-29',1),'2026-03-30')});
test('week renders seven days, fourteen meal slots, preserves missing-recipe entries and escapes content',()=>{const api=setup(),{iso,monday}=api.dates,day=monday(iso(new Date()));const html=api.render([{id:'r',title:'<script>bad</script>',image:'x.webp'}],[{id:'a',recipe_id:'r',planned_on:day,meal_slot:'abend',servings:5,note:'<b>note</b>'},{id:'b',recipe_id:'deleted',planned_on:day,meal_slot:'mittag',servings:2}],5);assert.equal((html.match(/class="wp-day /g)||[]).length,7);assert.equal((html.match(/data-week="add"/g)||[]).length,14);assert.match(html,/Rezept nicht mehr verfügbar/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<b>note</b>'));});
const cloud=fs.readFileSync('dist/cloud.js','utf8');
const methods=cloud.slice(cloud.indexOf('  async savePlan('),cloud.indexOf('  addPlan(p)'));
function cloudSetup({rows=[{id:'plan'}],error=null}={}){const calls=[];const q={update(d){calls.push(['update',d]);return q},insert(d){calls.push(['insert',d]);return q},delete(){calls.push(['delete']);return q},eq(k,v){calls.push([k,v]);return q},select(){return q},single:async()=>({data:rows[0],error}),then(fn){return Promise.resolve({data:rows,error}).then(fn)}};const api=vm.runInNewContext('({'+methods+'})',{family:{id:'family'},user:{id:'user'},navigator:{onLine:true},client:{from:()=>q},check:r=>{if(r.error)throw Error('database error');return r.data},refreshShared:async()=>calls.push(['refresh'])});return {calls,api};}
test('moving plan entry updates in place and scopes writes to current family',async()=>{const f=cloudSetup();await f.api.savePlan({recipe_id:'recipe',planned_on:'2026-11-12',meal_slot:'abend',servings:4},'plan');assert.ok(f.calls.some(x=>x[0]==='update'));assert.ok(!f.calls.some(x=>x[0]==='insert'));assert.ok(f.calls.some(x=>x[0]==='family_id'&&x[1]==='family'));assert.ok(f.calls.some(x=>x[0]==='id'&&x[1]==='plan'))});
test('failed writes and missing deletions never report success',async()=>{await assert.rejects(cloudSetup({error:true}).api.savePlan({}));await assert.rejects(cloudSetup({rows:[]}).api.deletePlan('missing'),/Eintrag fehlt/);});
test('recipe shortcut opens a new plan with selected recipe and detail portions',()=>{
 let dialog;const element={addEventListener(){},focus(){}};const context={window:{},document:{addEventListener(){},activeElement:element,createElement(){dialog={innerHTML:'',setAttribute(){},showModal(){},addEventListener(){},querySelector:()=>element};return dialog},body:{append(){}}}};
 vm.runInNewContext(source,context);const api=context.window.WEEK_PLAN;
 api.render([{id:'first',title:'Erstes Rezept',category:'abend'},{id:'chosen',title:'Gewähltes Rezept',category:'abend'}],[],5);
 api.openRecipe('chosen',8);
 assert.match(dialog.innerHTML,/<option value="chosen" selected>/);
 assert.match(dialog.innerHTML,/name="servings"[^>]*value="8"/);
 assert.match(dialog.innerHTML,/In Wochenplan eintragen/);
 assert.ok(!dialog.innerHTML.includes('Änderungen speichern'));
});
for(const fail of [false,true])test(`homepage popup saves without opening week view; failure=${fail}`,async()=>{
 let dialog,submit,returned=0,removed=false,payload;
 const field={addEventListener(){},focus(){}};
 const status={textContent:''};
 const form={addEventListener(type,fn){if(type==='submit')submit=fn}};
 const context={window:{FAMILY_CLOUD:{async savePlan(p){payload=p;if(fail)throw Error('Offline');return {...p,id:'new'}}}},FormData:class{get(k){return {recipe_id:'chosen',planned_on:'2026-11-12',meal_slot:'abend',servings:'5',note:''}[k]}},document:{getElementById(){return null},addEventListener(){},activeElement:field,createElement(){dialog={innerHTML:'',setAttribute(){},showModal(){},close(){},remove(){removed=true},addEventListener(){},querySelector(s){return s==='form'?form:s==='#wpFormStatus'?status:field},querySelectorAll(){return []}};return dialog},body:{append(){}}}};
 vm.runInNewContext(source,context);
 context.window.WEEK_PLAN.openRecipe('chosen',5,{recipes:[{id:'chosen',title:'Testgericht',category:'abend'}],plans:[],people:5,onSaved(){returned++}});
 assert.match(dialog.innerHTML,/<option value="chosen" selected>/);
 await submit({preventDefault(){},target:{}});
 assert.equal(payload.recipe_id,'chosen');assert.equal(returned,fail?0:1);assert.equal(removed,!fail);
 if(fail)assert.equal(status.textContent,'Offline');
});
