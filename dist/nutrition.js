/* Approximate generic ingredient values, kcal/100 g; not product-specific nutrition labels.
 * Amount assumptions are shown to the user. Unknown ingredients never count as zero.
 */
(()=>{'use strict';
// Macro carbohydrate excludes fibre (European nutrition-label convention).
const keys=['carbs','protein','fat','fiber'];
const m=(kcal,carbs,protein,fat,fiber)=>({kcal,carbs,protein,fat,fiber});
const zero=()=>({carbs:0,protein:0,fat:0,fiber:0});
const rules=[
 [/bulgur/,m(350,63,12,1.5,12),null],
 [/soba/,m(350,67,14,2,5),null],
 [/pizzoccheri/,m(350,65,13,3,6),null],
 [/wasser|^salz/,m(0,0,0,0,0),null], [/hähnchenoberkeulen/,m(170,0,19,10.5,0),null], [/hähnchenbrust/,m(110,0,23,1.5,0),null], [/rinderhack/,m(170,0,21,9.5,0),null], [/lachsfilet/,m(208,0,20,13,0),null],
 [/griechischer joghurt/,m(133,4,6,10,0),null], [/naturjoghurt/,m(61,4.7,3.5,3.5,0),null], [/magerquark/,m(67,4,12,0.2,0),null], [/skyr/,m(63,4,11,0.2,0),null], [/milch oder sojadrink/,m(47,4.9,3.4,1.5,0),null],
 [/butter oder neutrales öl/,m(744,0.6,0.7,82,0),null], [/butter/,m(744,0.6,0.7,82,0),null], [/olivenöl|rapsöl|sesamöl/,m(884,0,0,100,0),null],
 [/parmesan/,m(400,0,33,29,0),null], [/geriebener käse/,m(390,0.5,28,30,0),null], [/feta/,m(265,1,14,22,0),null], [/^ei\b|^eier\b|zusätzliches ei/,m(143,0.7,12.6,9.5,0),60],
 [/süßkartoffel/,m(86,17,1.6,0.1,3),null], [/kartoffel/,m(77,15,2,0.1,2),null], [/haferflocken/,m(372,59,13.5,7,10),null], [/dinkel.*mehl/,m(340,60,14,2.5,9),null], [/weizenvollkornmehl/,m(340,60,13,2.5,11),null], [/roggenmehl/,m(325,66,9,1.5,8),null], [/weizenmehl/,m(350,72,10,1,3),null],
 [/fladenbrot/,m(270,54,9,2,3),100], [/reis oder quinoa/,m(360,78,7,1,1.5),null], [/reis|bulgur/,m(350,78,7,1,1.5),null], [/soba|paccheri|rigatoni|pizzoccheri/,m(350,70,12,2,3.5),null],
 [/linsen.*trocken/,m(350,52,24,1.5,11),null], [/kichererbsen.*abgetropft/,m(140,18,7,2.5,6),null], [/edamame/,m(125,4,12,6,5),null], [/naturtofu/,m(140,1.5,15,8,1),null],
 [/tahini/,m(600,7,20,54,9),null], [/erdnussmus/,m(610,12,26,49,8),null], [/walnüsse/,m(654,7,15,65,7),null], [/mandeln/,m(610,6,21,54,11),null], [/cashew/,m(580,27,18,44,3.5),null], [/pinienkerne/,m(675,9,14,68,4),null], [/kürbiskerne/,m(560,11,30,46,6),null], [/chia/,m(490,5,17,31,34),null], [/leinsamen/,m(530,2,18,42,27),null], [/kokosraspel/,m(660,7,7,65,16),null], [/sesam/,m(575,10,18,50,12),null],
 [/kokosmilch/,m(190,3,2,19,1),null], [/honig/,m(304,76,0.3,0,0),null], [/speisestärke/,m(350,87,0.3,0.1,0),null], [/backkakao/,m(350,9,22,21,30),null], [/misopaste/,m(200,21,12,6,5),null], [/senf/,m(100,5,6,6,3),null], [/sojasauce/,m(55,5,8,0,0),null], [/gemüsebrühe/,m(5,0.5,0.2,0.2,0),null],
 [/avocado/,m(160,2,2,15,7),150], [/bananen/,m(89,20,1.1,0.3,2.6),120], [/mango/,m(60,13.5,0.8,0.4,1.6),250], [/äpfel/,m(52,11.5,0.3,0.2,2.4),150], [/birnen/,m(57,12,0.4,0.1,3),160], [/beeren/,m(45,7,1,0.5,4),null],
 [/limettensaft/,m(25,6,0.4,0.1,0.4),null], [/zitrone|limette/,m(29,3,1,0.3,3),50], [/gurke/,m(12,1.8,0.6,0.2,0.5),350], [/zucchini/,m(19,2,1.5,0.3,1),250], [/paprika(?!pulver)/,m(31,4.5,1,0.3,2),160], [/schalotten/,m(40,7,1.2,0.2,1.5),30], [/frühlingszwiebel/,m(32,4.7,1.8,0.2,2.6),15], [/zwiebel/,m(40,7,1.2,0.2,1.5),100], [/karotten/,m(41,6.8,0.9,0.2,2.8),80], [/knoblauch/,m(149,28,6.4,0.5,2),3],
 [/hokkaido/,m(63,12,1.7,0.6,2.5),null], [/brokkoli/,m(34,3,2.8,0.4,3),null], [/blumenkohl/,m(25,2.3,2,0.3,2.5),null], [/spitzkohl|wirsing/,m(27,3,2,0.2,3),null], [/spinat/,m(23,0.6,2.9,0.4,2.2),null], [/erbsen/,m(80,9,5,0.5,5),null], [/ingwer/,m(80,16,1.8,0.8,2),null], [/zitronengras/,m(99,20,1.8,0.5,3),15],
 [/petersilie|minze|schnittlauch|basilikum/,m(35,2,3,0.7,3),null], [/salbei/,m(45,4,3,1,5),0.5],
 [/trockenhefe/,m(325,15,40,7,20),null], [/frische hefe/,m(105,8,16,1.5,6),null], [/backmalz/,m(350,75,8,1.5,5),null], [/kreuzkümmel|koriander|paprikapulver|kurkuma|zimt|piment|pfeffer|muskat|kümmel|vanille|za'atar|brotgewürz/,m(300,35,10,10,25),null]
];
function ingredient(i){
 const name=String(i.name||'').toLocaleLowerCase('de'),rule=rules.find(([re])=>re.test(name));
 if(!rule||!Number.isFinite(Number(i.qty))||Number(i.qty)<0)return null;
 const unit=String(i.unit||'').toLowerCase();let grams;
 if(unit==='g'||unit==='ml')grams=1;
 else if(unit==='kg'||unit==='l')grams=1000;
 else if(['stk','stück','zehe','stange','blätter'].includes(unit))grams=rule[2];
 else if(unit==='bund')grams=30;
 else if(unit==='prise')grams=.2;
 else if(unit==='el'||unit==='tl'){
  const spoon=/öl|butter/.test(name)?13.5:/honig/.test(name)?20:/sesam/.test(name)?10:/speisestärke/.test(name)?10:/senf|sojasauce|saft/.test(name)?15:6;
  grams=unit==='el'?spoon:spoon/3;
 }
 if(!Number.isFinite(grams))return null;
 const macros=zero();for(const key of keys)macros[key]=Number(i.qty)*grams*rule[1][key]/100;
 return {macros,kcal:Number(i.qty)*grams*rule[1].kcal/100,grams:Number(i.qty)*grams,assumption:!['g','kg'].includes(unit)?`${i.name}: ${Number(i.qty)} ${i.unit} ≈ ${Math.round(Number(i.qty)*grams)} g`:null};
}
function estimate(r){
 let total=0,optional=0,weight=0,optionalWeight=0;const macros=zero(),optionalMacros=zero(),missing=[],assumptions=[];
 for(const i of r.ingredients||[]){const v=ingredient(i);if(!v){missing.push(i.name);continue}if(i.optional){optional+=v.kcal;optionalWeight+=v.grams}else{total+=v.kcal;weight+=v.grams}for(const key of keys)(i.optional?optionalMacros:macros)[key]+=v.macros[key];if(v.assumption)assumptions.push(v.assumption)}
 const servings=Number(r.servings);if(!servings||!r.ingredients?.length)missing.push('Portionsangabe oder Zutaten');
 return {weight,optionalWeight,macros,optionalMacros,macrosPerServing:Object.fromEntries(keys.map(k=>[k,macros[k]/servings])),optionalMacrosPerServing:Object.fromEntries(keys.map(k=>[k,optionalMacros[k]/servings])),total,optional,perServing:total/servings,optionalPerServing:optional/servings,missing,assumptions,complete:missing.length===0};
}
const round=n=>Math.round(n/10)*10;
function unit(r){return r.servingLabel==='Brot'?'Brot':r.servingLabel==='Ansatz'?'Ansatz':'Portion'}
function label(r){const n=estimate(r);return n.complete?`ca. ${round(n.perServing)} kcal / ${unit(r)}`:'Kalorien noch nicht berechenbar'}
function table(r){
 const n=estimate(r);if(!n.complete||n.weight<=0)return '';
 const format=x=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1,minimumFractionDigits:1}).format(x)+' g';
 const names={carbs:'Kohlenhydrate',protein:'Eiweiß',fat:'Fett',fiber:'Ballaststoffe'};
 function grid(includeOptional){
  const weight=n.weight+(includeOptional?n.optionalWeight:0),energy=n.total+(includeOptional?n.optional:0),servings=Number(r.servings);
  return `<div class="nutrition-table-wrap"><table class="nutrition-table"><caption>${includeOptional?'Mit optionalen Zutaten':'Grundrezept – ohne optionale Zutaten'}</caption><thead><tr><th scope="col">Nährwert</th><th scope="col">Pro 100 g<small style="display:block">Zutatenbasis</small></th><th scope="col">Pro ${unit(r)}</th></tr></thead><tbody><tr><th scope="row">Energie</th><td>ca. ${Math.round(energy/weight*100)} kcal</td><td>ca. ${round(energy/servings)} kcal</td></tr>${keys.map(k=>{const value=n.macros[k]+(includeOptional?n.optionalMacros[k]:0);return `<tr><th scope="row">${names[k]}</th><td>${format(value/weight*100)}</td><td>${format(value/servings)}</td></tr>`}).join('')}</tbody></table></div>`;
 }
 return `${grid(false)}${n.optionalWeight>0?`<details><summary>Mit optionalen Zutaten</summary>${grid(true)}</details>`:''}<p class="small-caption">Alle Werte sind geschätzt. Pro 100 g bezieht sich auf das Zutatengewicht vor der Zubereitung, einschließlich aufgeführtem Wasser. Wasseraufnahme und Wasserverlust beim Kochen oder Backen verändern die Werte pro 100 g des fertigen Gerichts. Ballaststoffe sind separat ausgewiesen und nicht in den Kohlenhydraten enthalten. Die Angaben pro ${unit(r)} bleiben beim Hochskalieren des gesamten Rezepts gleich.</p>`;
}
window.RECIPE_NUTRITION={table,estimate,label,unit,round,ingredient};
})();
