import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/cloud.js','utf8');
const method=source.slice(source.indexOf('  async deleteRecipe(id){'),source.indexOf('  async recipeChat('));
function setup(role='owner',rows=[{id:'recipe-1'}]){
 const calls=[];const chain={delete(){calls.push('delete');return this},eq(k,v){calls.push([k,v]);return this},async select(){return {data:rows}}};
 const context={family:{id:'family-1',role},navigator:{onLine:true},client:{from:()=>chain},check:r=>r.data,refreshRecipes:async()=>calls.push('recipes'),refreshShared:async()=>calls.push('shared')};
 return {calls,api:vm.runInNewContext('({'+method+'})',context)};
}
test('members cannot delete',async()=>{const f=setup('member');await assert.rejects(f.api.deleteRecipe('recipe-1'),/administratoren/i);assert.equal(f.calls.length,0)});
test('deletion scopes by family and id and refreshes both views',async()=>{const f=setup();await f.api.deleteRecipe('recipe-1');assert.deepEqual(f.calls,['delete',['family_id','family-1'],['id','recipe-1'],'recipes','shared'])});
test('zero affected rows never reports success',async()=>{const f=setup('owner',[]);await assert.rejects(f.api.deleteRecipe('recipe-1'),/nicht gelöscht/);assert.ok(!f.calls.includes('recipes'))});
