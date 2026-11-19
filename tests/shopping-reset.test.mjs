import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/cloud.js','utf8');
const method=source.slice(source.indexOf('  removeCart(id){'),source.indexOf('  setCheck('));
function fixture(failReset=false){
 const db={shopping_checks:[{family_id:'ours',item_key:'salt',checked:true},{family_id:'ours',item_key:'manual',checked:true},{family_id:'other',item_key:'salt',checked:true}],shopping_recipes:[{family_id:'ours',recipe_id:'a'},{family_id:'ours',recipe_id:'b'},{family_id:'other',recipe_id:'a'}]};
 const client={from(table){const filters=[];return {delete(){return this},eq(k,v){filters.push([k,v]);return this},then(resolve){if(failReset&&table==='shopping_checks')return Promise.resolve({error:new Error('network')}).then(resolve);db[table]=db[table].filter(row=>!filters.every(([k,v])=>row[k]===v));return Promise.resolve({error:null}).then(resolve)}}}};
 const api=vm.runInNewContext('({'+method+'})',{client,family:{id:'ours'},mutate:fn=>fn(),check:r=>{if(r.error)throw r.error;}});
 return {db,api};
}
test('removal resets every family check while retaining other recipes and families',async()=>{
 const {db,api}=fixture();await api.removeCart('a');
 assert.deepEqual(db.shopping_checks,[{family_id:'other',item_key:'salt',checked:true}]);
 assert.deepEqual(db.shopping_recipes,[{family_id:'ours',recipe_id:'b'},{family_id:'other',recipe_id:'a'}]);
 db.shopping_recipes.push({family_id:'ours',recipe_id:'a'});
 assert.equal(db.shopping_checks.filter(r=>r.family_id==='ours').length,0);
});
test('failed reset stops removal so it can be retried',async()=>{
 const {db,api}=fixture(true);await assert.rejects(api.removeCart('a'),/network/);
 assert.equal(db.shopping_recipes.length,3);assert.equal(db.shopping_checks.length,3);
});
