/* Familienküche Cloud v3 – sichere Rezeptverwaltung für Familien-Owner.
   Kein Service-Key im Browser: der Server erzwingt Schreibrechte über Supabase RLS. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories=['abend','brot','aufstrich','hafer'];
const modes=['hand','topf','ofen','pfanne','tm6','airfryer','kuehlschrank'];
let host=null,verified=null,verifiedRaw='',busy=false;
const sample={
 id:'neues-familienrezept',title:'Neues Familienrezept',category:'abend',cuisine:'Mediterran',minutes:35,
 servings:5,servingLabel:'Personen',description:'Ein aromatisches Gericht für unsere Familie.',note:'Schärfe erst am Tisch ergänzen.',
 image:'rezept-neu.svg',tags:['vegetarisch','thermomix'],
 ingredients:[
  {name:'Kartoffeln',qty:900,unit:'g',group:'Gemüse & Obst',optional:false},
  {name:'Olivenöl',qty:2,unit:'EL',group:'Nüsse, Samen & Fette',optional:false}
 ],
 steps:[
  {title:'Vorbereiten',body:'Kartoffeln waschen und in Würfel schneiden.',mode:'hand'},
  {title:'Garen',body:'Im Backofen bei 210 °C etwa 25 Minuten rösten.',mode:'ofen',minutes:25}
 ]
};
const slug=s=>String(s).toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,74);
function normalized(raw,i){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Rezept '+(i+1)+': JSON-Objekt erwartet.');
 const r=structuredClone(raw);
 r.title=String(r.title||'').trim();
 if(r.title.length<3||r.title.length>120)throw Error('Rezept '+(i+1)+': Titel muss 3–120 Zeichen enthalten.');
 r.id=String(r.id||slug(r.title)).trim();
 if(!/^[a-z0-9][a-z0-9-]{2,79}$/.test(r.id))throw Error(r.title+': id nur Kleinbuchstaben, Zahlen und Bindestriche (3–80 Zeichen).');
 if(!categories.includes(r.category))throw Error(r.title+': category muss abend, brot, aufstrich oder hafer sein.');
 r.cuisine=String(r.cuisine||'Familienküche').trim();
 if(!r.cuisine||r.cuisine.length>60)throw Error(r.title+': Küche ist zu lang oder leer.');
 r.description=String(r.description||'').trim();
 if(!r.description||r.description.length>500)throw Error(r.title+': description fehlt oder ist zu lang.');
 r.note=String(r.note||'').trim();
 if(r.note.length>500)throw Error(r.title+': note ist zu lang.');
 for(const k of ['minutes','servings']){
   r[k]=Number(r[k]);
   if(!Number.isInteger(r[k])||r[k]<1||r[k]>(k==='servings'?30:1440))throw Error(r.title+': '+k+' muss eine gültige Zahl sein.');
 }
 r.servingLabel=String(r.servingLabel||'Personen').trim();
 if(!r.servingLabel||r.servingLabel.length>35)throw Error(r.title+': servingLabel ungültig.');
 r.tags=Array.isArray(r.tags)?r.tags.map(x=>String(x).trim()):[];
 if(r.tags.length>15||r.tags.some(t=>t.length>35))throw Error(r.title+': tags ungültig.');
 r.image=String(r.image||'rezept-neu.svg');
 if(!/^[a-zA-Z0-9_.-]{1,100}$/.test(r.image))throw Error(r.title+': image muss ein Dateiname sein.');
 if(r.imageUrl!==undefined&&r.imageUrl!==null&&r.imageUrl!==''){
   r.imageUrl=String(r.imageUrl);
   if(!/^https:\/\/[^\s<>"']+$/i.test(r.imageUrl)||r.imageUrl.length>2000)throw Error(r.title+': imageUrl muss eine sichere HTTPS-Adresse sein.');
 }else delete r.imageUrl;
 if(!Array.isArray(r.ingredients)||r.ingredients.length<1||r.ingredients.length>80)throw Error(r.title+': ingredients muss 1–80 Einträge enthalten.');
 r.ingredients=r.ingredients.map((a,j)=>{
   if(!a||typeof a!=='object')throw Error(r.title+': Zutat '+(j+1)+' ist ungültig.');
   const name=String(a.name||'').trim(),unit=String(a.unit||'').trim(),group=String(a.group||'Gewürze & Sonstiges').trim(),qty=Number(a.qty);
   if(!name||name.length>120||unit.length>24||!group||group.length>80||!Number.isFinite(qty)||qty<=0||qty>1e6)throw Error(r.title+': Zutat '+(j+1)+' hat ungültige Werte.');
   return {name,qty,unit,group,optional:!!a.optional};
 });
 if(!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>60)throw Error(r.title+': steps muss 1–60 Kochschritte enthalten.');
 r.steps=r.steps.map((s,j)=>{
   if(!s||typeof s!=='object')throw Error(r.title+': Schritt '+(j+1)+' ist ungültig.');
   const title=String(s.title||'').trim(),body=String(s.body||'').trim(),mode=String(s.mode||'hand');
   if(!title||title.length>110||!body||body.length>1800||!modes.includes(mode))throw Error(r.title+': Schritt '+(j+1)+' unvollständig/ungültig.');
   const out={title,body,mode};
   if(s.minutes!==undefined&&s.minutes!==null){out.minutes=Number(s.minutes);if(!Number.isInteger(out.minutes)||out.minutes<1||out.minutes>1440)throw Error(r.title+': Timer in Schritt '+(j+1)+' ungültig.');}
   return out;
 });
 return r;
}
function parse(raw){
 if(raw.length>250000)throw Error('Import zu groß (max. 250 KB).');
 let o;try{o=JSON.parse(raw)}catch(e){throw Error('Ungültiges JSON. Prüfe Kommas, Anführungszeichen und Klammern.');}
 const rows=Array.isArray(o)?o:Array.isArray(o?.recipes)?o.recipes:[o];
 if(rows.length<1||rows.length>15)throw Error('Bitte 1–15 Rezepte pro Import.');
 const list=rows.map(normalized);
 const seen=new Set();for(const r of list){if(seen.has(r.id))throw Error('Doppelte Rezept-ID: '+r.id);seen.add(r.id);}
 return list;
}
function pretty(v){return JSON.stringify(v,null,2)}
function showPreview(){
 const slot=host?.querySelector('#raReview');if(!slot)return;
 if(!verified){slot.innerHTML='<p class="ra-muted">Zum Prüfen auf „Import prüfen“ tippen. Noch wird nichts gespeichert.</p>';return;}
 slot.innerHTML='<h3>Vorschau vor Veröffentlichung</h3>'+verified.map(r=>{
 const existing=(window.RECIPES||[]).find(x=>x.id===r.id);
 return `<div class="ra-check"><span class="ra-chip ${existing?'ra-update':'ra-new'}">${existing?'Aktualisierung':'Neu'}</span><div><strong>${esc(r.title)}</strong><small>${r.servings} Personen/Einheiten · ${r.ingredients.length} Zutaten · ${r.steps.length} Schritte · ${r.minutes} Minuten</small></div></div>`;
 }).join('')+'<p class="ra-muted">Beim Speichern werden gleichnamige Rezept-IDs aktualisiert. Alle Familienmitglieder sehen die veröffentlichte Version nach der Synchronisierung.</p>';
}
function resetDraft(text){const t=host.querySelector('#raJson');t.value=text;verified=null;verifiedRaw='';host.querySelector('[data-ra="publish"]').disabled=true;showPreview();t.focus();}
const recipeNumber=r=>r.recipeNumber?'R-'+String(r.recipeNumber).padStart(4,'0'):'Nummer wird geladen';
function renderLibrary(query=''){
 const slot=host?.querySelector('#raLibrary');if(!slot)return;
 const rows=[...(window.RECIPES||[])].filter(r=>(r.title+' '+recipeNumber(r)).toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))).sort((a,b)=>a.title.localeCompare(b.title,'de'));
 slot.innerHTML=rows.length?rows.map(r=>`<article class="ra-library-row"><div><strong>${esc(r.title)}</strong><small>Rezeptnummer: ${esc(recipeNumber(r))}</small><small>${esc(window.RECIPE_NUTRITION.label(r))} · geschätzt</small><small>${r.minutes} Min. · ${r.servings} ${esc(r.servingLabel)}</small></div><div class="ra-actions"><button class="btn btn-soft" data-ra="edit" data-id="${esc(r.id)}" aria-label="Bearbeiten: ${esc(r.title)}">Bearbeiten</button><button class="btn btn-danger" data-ra="delete" data-id="${esc(r.id)}" aria-label="Löschen: ${esc(r.title)}">Löschen</button></div></article>`).join(''):'<p class="ra-muted">Keine passenden Rezepte.</p>';
}
function render(){
 const existing=[...(window.RECIPES||[])].sort((a,b)=>a.title.localeCompare(b.title,'de'));
 host.innerHTML=`<section class="ra-sheet" role="dialog" aria-modal="true" aria-label="Rezeptverwaltung">
 <header class="ra-header"><div><div class="eyebrow">Familienküche · Administrator</div><h2>Rezepte verwalten</h2></div><button class="ra-close" data-ra="close" aria-label="Schließen">×</button></header>
 <div class="ra-body"><div class="ra-intro"><strong>Neue Rezepte veröffentlichen – ohne App-Update</strong><p>Im Chat ein Rezept ausarbeiten, als JSON hier einfügen, prüfen und freigeben. Die gemeinsame Datenbank verteilt es auf alle Handys.</p></div>
 <section aria-label="Vorhandene Rezepte"><label class="ra-label">Rezepte suchen<input id="raSearch" class="field" type="search" placeholder="Rezeptname oder Nummer, z. B. R-0001 …"></label><p class="ra-muted">Löschen entfernt das Rezept für die ganze Familie, auch aus Einkaufsliste und Essensplan. Die Aktion ist endgültig.</p><div id="raLibrary" class="ra-library"></div><p id="raDeleteInfo" class="ra-muted" role="status" aria-live="polite"></p></section>
 <div class="ra-tools"><button class="btn btn-soft" data-ra="copy-ai-guide">KI-Anleitung kopieren</button><button class="btn btn-soft" data-ra="template">＋ Neue Vorlage</button><button class="btn btn-white" data-ra="copy-template">Vorlage kopieren</button></div>
 <label class="ra-label">Bestehendes Rezept zum Bearbeiten öffnen
  <select id="raExisting" class="field"><option value="">Rezept auswählen …</option>${existing.map(r=>`<option value="${esc(r.id)}">${esc(recipeNumber(r))} · ${esc(r.title)}</option>`).join('')}</select>
 </label>
 <label class="ra-label" for="raJson">Rezeptdaten aus ChatGPT (JSON)</label>
 <textarea id="raJson" class="ra-editor" spellcheck="false" placeholder="JSON-Rezept hier einfügen …"></textarea>
 <div class="ra-actions"><button class="btn btn-soft" data-ra="validate">✓ Import prüfen</button><label class="btn btn-white ra-file">Datei importieren<input type="file" id="raFile" accept=".json,application/json"></label></div>
 <div id="raReview" class="ra-review"><p class="ra-muted">Zum Prüfen auf „Import prüfen“ tippen. Noch wird nichts gespeichert.</p></div>
 <div class="ra-media"><strong>Optional: neues Food-Foto</strong><p>Du kannst ein neues Foto (maximal 4 MB) hochladen. Es wird in Supabase Storage öffentlich per URL erreichbar – verwende keine Familien- oder Personenfotos. Benötigt die mitgelieferte Migration 06.</p><input type="file" id="raPhoto" accept="image/jpeg,image/png,image/webp"/><small id="raPhotoStatus" class="ra-muted"></small></div>
 <button class="btn btn-primary btn-block ra-publish" data-ra="publish" ${verified?'':'disabled'}>Rezept(e) für Familie veröffentlichen</button><p id="raMessage" class="ra-muted" role="status" aria-live="polite"></p>
 </div></section>`;
 showPreview();
 renderLibrary();
}
function message(s,error=false){const el=host?.querySelector('#raMessage');if(el){el.textContent=s;el.style.color=error?'#ad4036':'#28623b'}}
function verify(){const raw=host.querySelector('#raJson').value;try{verified=parse(raw);verifiedRaw=raw;showPreview();host.querySelector('[data-ra="publish"]').disabled=false;message(verified.length+' Rezept(e) geprüft und bereit zur Veröffentlichung.');return verified;}catch(e){verified=null;verifiedRaw='';showPreview();host.querySelector('[data-ra="publish"]').disabled=true;message(e.message,true);return null;}}
function template(){return pretty(sample)}
function aiGuide(){return `Entwickle ein Rezept für meine Familienküche-App.

Arbeite das Rezept zunächst mit mir aus. Wenn ich „für die App exportieren“ sage, liefere ausschließlich ein gültiges JSON-Objekt – ohne Markdown-Codeblock, Einleitung oder Kommentare.

Standardvorgaben:
- Für 5 Personen, sofern ich nichts anderes angebe.
- Ohne Tomaten, Champignons und weiße Bohnen.
- Familienfreundlich, alltagstauglich und geschmackvoll.
- Thermomix, Airfryer, Herd oder Backofen passend zu meinem Wunsch einsetzen.
- Keine medizinischen Wirkversprechen.

Das JSON muss diese Struktur verwenden (Beispiel, durch das ausgearbeitete Rezept ersetzen):
${template()}

Verbindliche Formatregeln:
- Keine zusätzlichen Felder erfinden.
- Alle Texte auf Deutsch.
- JSON verwendet doppelte Anführungszeichen und keine abschließenden Kommas.
- Mengen sind Zahlen mit Dezimalpunkt, keine Zeichenketten oder Brüche.
- Alle Mengen beziehen sich auf die angegebene Portionszahl.
- Jede im Ablauf verwendete Zutat muss in ingredients vorkommen, ausgenommen gewöhnliches Kochwasser.
- Optionale Zutaten mit optional: true kennzeichnen.
- Für gleiche Zutaten einheitliche Namen und Einheiten verwenden, damit die Einkaufsliste sie zusammenfassen kann.

Zulässige Werte und Grenzen:
- id: eindeutige Kennung aus Kleinbuchstaben, Zahlen und Bindestrichen, 3–80 Zeichen; beginnt mit Buchstabe oder Zahl. Für ein neues Rezept eine neue ID verwenden. Eine bestehende ID nur beibehalten, wenn ich ausdrücklich ein Rezept aktualisieren möchte.
- title: 3–120 Zeichen.
- category: ausschließlich "abend", "brot", "aufstrich" oder "hafer".
- cuisine: 1–60 Zeichen.
- minutes: gesamte Zubereitungsdauer einschließlich relevanter Wartezeiten, ganze Zahl von 1 bis 1440.
- servings: ganze Zahl von 1 bis 30.
- servingLabel: 1–35 Zeichen, z. B. "Personen" oder "Brot".
- description: 1–500 Zeichen.
- note: maximal 500 Zeichen; darf leer sein.
- image: immer "rezept-neu.svg", solange ich kein vorhandenes Bild angebe. Keine Bildadresse erfinden.
- tags: höchstens 15 kurze Begriffe mit jeweils maximal 35 Zeichen. Für passende Geräte/Ernährungsweisen bevorzugt "thermomix", "airfryer", "vegetarisch", "fisch" oder "geflügel".
- ingredients: 1–80 Zutaten.
  - name: 1–120 Zeichen.
  - qty: Zahl größer als 0, höchstens 1000000.
  - unit: maximal 24 Zeichen, z. B. "g", "ml", "EL", "TL", "Stk".
  - group: 1–80 Zeichen; sinnvolle Einkaufsgruppe.
  - optional: true oder false.
- steps: 1–60 Schritte.
  - title: 1–110 Zeichen.
  - body: 1–1800 Zeichen, verständlich und vollständig.
  - mode: ausschließlich "hand", "topf", "ofen", "pfanne", "tm6", "airfryer" oder "kuehlschrank".
  - minutes: optional; nur bei sinnvollen Timern als ganze Zahl von 1 bis 1440 angeben. Andernfalls weglassen.

Qualitätsprüfung vor dem Export:
- Stimmen Zutaten, Mengen, Portionen und Schritte überein?
- Sind Temperaturen, Heizart und Garzeiten eindeutig?
- Bei Thermomix: Zeit, Temperatur, Stufe und gegebenenfalls Linkslauf angeben; Gerätegrenzen beachten.
- Parallel laufende Schritte sinnvoll beschreiben.
- Keine erfundenen Funktionen oder unsicheren Garangaben verwenden.
- Bei fehlenden entscheidenden Informationen nachfragen.

Mein Rezeptwunsch:
[Hier Gericht, Zutaten, Geräte und besondere Wünsche eintragen.]`;}
const api={open(){if(window.FAMILY_CLOUD?.family?.role!=='owner')return;host=document.createElement('div');host.className='ra-backdrop';document.body.appendChild(host);document.body.classList.add('ra-open');render();resetDraft(template())},close(){host?.remove();host=null;document.body.classList.remove('ra-open')},parse};
window.RECIPE_ADMIN=api;
document.addEventListener('click',async e=>{
 const a=e.target.closest('[data-ra]');if(!a||!host||!host.contains(a))return;
 e.preventDefault();const op=a.dataset.ra;
 if(busy)return;
 if(op==='edit'){
   const recipe=(window.RECIPES||[]).find(r=>r.id===a.dataset.id);if(!recipe)return;
   host.querySelector('#raExisting').value=recipe.id;resetDraft(pretty(recipe));message('Rezept zum Bearbeiten geladen. Änderungen prüfen und veröffentlichen.');return;
 }
 if(op==='delete'){
   const recipe=(window.RECIPES||[]).find(r=>r.id===a.dataset.id);if(!recipe)return;
   if(!confirm('„'+recipe.title+'“ endgültig für die ganze Familie löschen?\n\nZugehörige Einträge in Einkaufsliste und Essensplan werden ebenfalls entfernt. Dies kann nicht rückgängig gemacht werden.'))return;
   busy=true;const info=host.querySelector('#raDeleteInfo');a.disabled=true;info.textContent='Rezept wird gelöscht …';
   try{
     await window.FAMILY_CLOUD.deleteRecipe(recipe.id);
     host.querySelector('#raExisting option[value="'+CSS.escape(recipe.id)+'"]')?.remove();
     // Invalidate any import preview containing the deleted record.
     verified=null;verifiedRaw='';host.querySelector('[data-ra="publish"]').disabled=true;
     host.querySelector('#raJson').value='';showPreview();
     renderLibrary(host.querySelector('#raSearch').value);
     info.textContent='„'+recipe.title+'“ wurde für die Familie gelöscht.';
   }catch(error){info.textContent='Löschen fehlgeschlagen: '+error.message;a.disabled=false;}
   finally{busy=false;}return;
 }
 if(op==='close'){api.close();return;}
 if(op==='template'){resetDraft(template());message('Neue Vorlage geladen.');return;}
 if(op==='copy-template'){try{await navigator.clipboard.writeText(template());message('Rezeptvorlage kopiert.')}catch(err){message('Kopieren nicht möglich. Vorlage im Textfeld markieren.',true)}return;}
 if(op==='copy-ai-guide'){
   try{await navigator.clipboard.writeText(aiGuide());a.textContent='✓ Anleitung kopiert';message('KI-Anleitung kopiert. In der anderen KI einfügen und unten deinen Rezeptwunsch ergänzen.');}
   catch{a.textContent='Kopieren fehlgeschlagen';message('Die Zwischenablage wurde vom Browser blockiert. Bitte den Zugriff erlauben und erneut klicken.',true);}
   setTimeout(()=>{if(a.isConnected)a.textContent='KI-Anleitung kopieren'},3500);return;
 }
 if(op==='validate'){verify();return;}
 if(op==='publish'){
   if(busy)return;
   const raw=host.querySelector('#raJson').value;
   if(!verified||raw!==verifiedRaw){verify();message('Inhalt wurde geändert. Bitte Vorschau erneut prüfen.',true);return;}
   if(!confirm(`${verified.length} Rezept(e) in der gemeinsamen Familiendatenbank veröffentlichen? Bestehende Rezepte mit derselben ID werden ersetzt.`))return;
   busy=true;a.disabled=true;message('Rezepte werden sicher in Supabase gespeichert …');
   try{const count=await window.FAMILY_CLOUD.publishRecipes(verified);message(count+' Rezept(e) veröffentlicht. Änderungen sind auf allen angemeldeten Geräten verfügbar.');verified=null;verifiedRaw='';showPreview();}
   catch(err){message('Veröffentlichung fehlgeschlagen: '+err.message,true);}
   finally{busy=false;if(host){host.querySelector('[data-ra="publish"]').disabled=!verified;}}return;
 }
});
document.addEventListener('change',async e=>{
 if(!host||!host.contains(e.target))return;
 if(e.target.id==='raExisting'){
   const r=(window.RECIPES||[]).find(x=>x.id===e.target.value);if(r){resetDraft(pretty(r));message('Rezept geladen. ID beibehalten, um die vorhandene Version zu aktualisieren.');}
 }
 if(e.target.id==='raFile'){
   const file=e.target.files?.[0];if(!file)return;if(file.size>250000){message('Datei zu groß (max. 250 KB).',true);return;}
   resetDraft(await file.text());message('Datei geladen. Bitte vor dem Speichern prüfen.');
 }
 if(e.target.id==='raPhoto'){
   const file=e.target.files?.[0];if(!file)return;
   const slot=host.querySelector('#raPhotoStatus');
   try{
     const list=parse(host.querySelector('#raJson').value);
     if(list.length!==1)throw Error('Für den Bildupload bitte genau ein Rezept im Editor öffnen.');
     slot.textContent='Bild wird hochgeladen …';
     const url=await window.FAMILY_CLOUD.uploadRecipePhoto(file);
     list[0].imageUrl=url;
     resetDraft(pretty(list[0]));slot.textContent='Bild-URL in das Rezept übernommen. Bitte prüfen und veröffentlichen.';
   }catch(err){slot.textContent='Upload fehlgeschlagen: '+err.message;}
 }
});
document.addEventListener('input',e=>{
 if(host&&e.target.id==='raSearch'){renderLibrary(e.target.value);return;}
 if(host&&e.target.id==='raJson'){
   verified=null;verifiedRaw='';const p=host.querySelector('[data-ra="publish"]');if(p)p.disabled=true;
   showPreview();message('Entwurf verändert – vor der Veröffentlichung erneut prüfen.');
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host)api.close()});
})();
