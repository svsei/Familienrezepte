import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
function setup(fail=false){
 const listeners={},elements={};const host={innerHTML:'',addEventListener:(n,f)=>listeners[n]=f,setAttribute(){},showModal(){},close(){},remove(){},querySelector:s=>elements[s]??=( {value:'Kartoffeln bitte',focus(){}} )};
 const calls=[];const draft={title:'Kartoffeln',description:'Lecker',ingredients:[],steps:[],minutes:30,servings:5};
 const window={FAMILY_CLOUD:{user:{},family:{role:'owner'},recipeChat:async(m,d,s,action)=>{calls.push(action||'text');if(action){if(fail)throw Error('Bildlimit erreicht');return {base64:'/9j/2Q==',mimeType:'image/jpeg'}}return {reply:'Fertig',recipe:draft}},uploadRecipePhoto:async f=>{assert.equal(f.type,'image/jpeg');calls.push('upload');return 'https://example.com/image.jpg'},saveNewRecipe:async d=>calls.push({...d})},RECIPE_ADMIN:{parse:s=>[JSON.parse(s)]}};
 vm.runInNewContext(fs.readFileSync('dist/recipe-chat.js','utf8'),{window,document:{activeElement:{focus(){}},createElement:()=>host,body:{append(){}},addEventListener(){}},crypto:webcrypto,AbortController,setTimeout,clearTimeout,Uint8Array,atob,File,confirm:()=>true});
 window.RECIPE_CHAT.open();return {host,calls,submit:()=>listeners.submit({target:{id:'recipeChatForm'},preventDefault(){}}),click:a=>listeners.click({target:{closest:()=>({dataset:{chat:a}})}})};
}
test('complete recipe automatically receives an image, uploaded before saving its URL',async()=>{const f=setup();await f.submit();assert.deepEqual(f.calls,['text','image']);assert.match(f.host.innerHTML,/data:image\/jpeg;base64/);await f.click('save');assert.equal(f.calls[2],'upload');assert.equal(f.calls[3].imageUrl,'https://example.com/image.jpg')});
test('failed image leaves recipe available to save without image',async()=>{const f=setup(true);await f.submit();assert.match(f.host.innerHTML,/Bildlimit erreicht/);assert.match(f.host.innerHTML,/Kartoffeln/);await f.click('save');assert.equal(f.calls.length,3);assert.equal(f.calls[2].title,'Kartoffeln');assert.equal(f.calls[2].imageUrl,undefined)});
