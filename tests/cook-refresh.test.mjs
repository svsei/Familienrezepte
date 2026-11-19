import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('dist/app.js','utf8');
function setup(tab='cook',open=true,recipeId='r1'){
 let renders=0,ticks=0;
 let panel={open,dataset:{recipeId}};
 const badge={};
 const main={querySelector:()=>panel,set innerHTML(value){renders++;panel={open:false,dataset:{recipeId:'r1'}}}};
 const context={st:{tab,cook:{id:'r1'},cart:{}},main,shoppingDoneOpen:false,BY_ID:new Map(),document:{getElementById:id=>id==='shoppingDone'?null:badge,querySelectorAll:()=>[]},updateTimerDisplays:()=>ticks++,cookPage:()=>'',recipesPage:()=>'',shoppingPage:()=>'',planPage:()=>'',settingsPage:()=>'',window:{},save:()=>{},flash:()=>{}};
 vm.createContext(context);
 vm.runInContext(src.split('\n').find(l=>l.startsWith('function render(')),context);
 vm.runInContext(src.split('\n').find(l=>l.startsWith('window.FAMILY_APP=')),context);
 return {context,main,get renders(){return renders},get ticks(){return ticks},get panel(){return panel}};
}
test('background sync updates data without replacing the cooking DOM',()=>{
 const f=setup();const before=f.panel;
 for(let i=0;i<3;i++)f.context.window.FAMILY_APP.applyShared({cart:{},checked:{milk:true},custom:[],plans:[{id:i}]});
 assert.equal(f.renders,0);assert.equal(f.panel,before);
 assert.equal(f.context.st.plans[0].id,2);
 assert.equal(f.context.st.checked.milk,true);
});
test('normal cooking render retains open ingredients and updates timer display',()=>{
 const f=setup();f.context.render();assert.equal(f.renders,1);assert.equal(f.panel.open,true);assert.equal(f.ticks,1);
});
test('closed ingredients stay closed and a different recipe does not inherit open state',()=>{
 for(const f of [setup('cook',false),setup('cook',true,'other')]){
  f.context.render();assert.equal(f.panel.open,false);
 }
});
test('background updates continue rendering other views',()=>{
 const f=setup('shopping');f.context.window.FAMILY_APP.applyShared({cart:{},checked:{},custom:[],plans:[]});assert.equal(f.renders,1);
});
