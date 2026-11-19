import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('dist/app.js','utf8');
const funcs=['shoppingItemRow','shoppingPage'].map(name=>src.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n');
const items=[{key:'a',name:'Apfel',group:'Obst'},{key:'b',name:'Brot',group:'Backwaren',manual:true,id:'custom-1'}];
function setup(list=items){const context={st:{checked:{b:true},includeOptional:false},shoppingDoneOpen:false,aggregated:()=>list,chosenRecipes:()=>[],h:v=>String(v),amount:()=> '1 Stk'};vm.createContext(context);vm.runInContext(funcs,context);return {context,render:()=>vm.runInContext('shoppingPage()',context)}}
test('checked items appear only in the collapsed completed section; empty groups disappear',()=>{const f=setup();const html=f.render();const [top,bottom]=html.split('<details');assert.ok(top.includes('Apfel'));assert.ok(!top.includes('Backwaren'));assert.ok(!top.includes('>Brot<'));assert.ok(bottom.includes('>Brot<'));assert.ok(bottom.includes('data-action="remove-custom"'));assert.ok(!bottom.startsWith(' id="shoppingDone" class="shopping-done" open'));});
test('unchecking returns item to the open list and removes empty completed section',()=>{const f=setup();f.context.st.checked.b=false;const html=f.render();assert.ok(html.includes('>Brot<'));assert.ok(!html.includes('<details'));});
test('all checked and empty lists have distinct states',()=>{const f=setup();f.context.st.checked.a=true;assert.ok(f.render().includes('Alles abgehakt!'));assert.ok(setup([]).render().includes('Deine Liste ist noch leer'));});
test('expanded state is retained when requested',()=>{const f=setup();f.context.shoppingDoneOpen=true;assert.ok(f.render().includes('class="shopping-done" open'));});
