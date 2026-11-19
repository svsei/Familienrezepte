(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s+'T12:00:00');
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shift=(s,n)=>{const d=date(s);d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=date(s);return shift(s,-((d.getDay()+6)%7))};
const today=()=>iso(new Date());
const label=s=>date(s).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
let week=monday(today()),recipes=[],plans=[],people=5,modal=null,busy=false,opener=null,message='';
const image=r=>r.imageUrl&&/^https:\/\/[^\s<>"']+$/i.test(r.imageUrl)?r.imageUrl:'images/'+String(r.image||'rezept-neu.svg').replace(/[^a-zA-Z0-9_.-]/g,'');
function content(){
 const end=shift(week,6),visible=plans.filter(p=>p.planned_on>=week&&p.planned_on<=end);
 return `<div class="page-intro"><div class="eyebrow">Zusammen die Woche planen</div><h1>Unser Wochenplan</h1><p>Wählt eure Gerichte für jeden Tag. Der Plan wird mit eurer Familie geteilt.</p></div><div class="wp-toolbar"><div class="wp-navigation"><button class="btn btn-soft" data-week="prev" aria-label="Vorherige Woche">←</button><strong aria-live="polite">${label(week)} – ${label(end)}</strong><button class="btn btn-soft" data-week="next" aria-label="Nächste Woche">→</button></div><div class="wp-navigation"><button class="btn btn-white" data-week="today">Diese Woche</button><label>Woche wählen<input class="field" type="date" data-week-date value="${week}" aria-label="Datum der gewünschten Woche"></label></div></div><p class="small-caption">${visible.length} ${visible.length===1?'geplantes Gericht':'geplante Gerichte'} · Tippe bei einem Tag auf „Rezept hinzufügen“.</p><p class="wp-status" role="status">${esc(message)}</p><div class="wp-days">${Array.from({length:7},(_,n)=>{
 const day=shift(week,n),isToday=day===today();return `<section class="wp-day ${isToday?'wp-today':''}" aria-label="${esc(date(day).toLocaleDateString('de-DE',{weekday:'long'}))} ${label(day)}"><header><h2>${date(day).toLocaleDateString('de-DE',{weekday:'long'})}</h2><span>${label(day)}${isToday?' · Heute':''}</span></header>${['mittag','abend'].map(slot=>`<div class="wp-slot"><h3>${slot==='mittag'?'Mittagessen':'Abendessen'}</h3>${visible.filter(p=>p.planned_on===day&&p.meal_slot===slot).map(p=>{
 const r=recipes.find(r=>r.id===p.recipe_id);return `<article class="wp-recipe">${r?`<img src="${image(r)}" alt="" loading="lazy">`:''}<strong>${esc(r?.title||'Rezept nicht mehr verfügbar')}</strong><small>${p.servings} Portionen</small>${p.note?`<p>${esc(p.note)}</p>`:''}<div class="wp-recipe-actions"><button class="text-button" data-week="edit" data-plan-id="${esc(p.id)}">Bearbeiten / Verschieben</button>${r?`<button class="text-button" data-action="detail" data-id="${esc(r.id)}">Rezept ansehen</button><button class="text-button" data-action="plan-shop" data-id="${esc(r.id)}" data-servings="${p.servings}">+ Einkaufsliste</button>`:''}<button class="text-button" data-week="remove" data-plan-id="${esc(p.id)}">Entfernen</button></div></article>`}).join('')}<button class="wp-add" data-week="add" data-day="${day}" data-slot="${slot}" ${!recipes.length?'disabled':''}>+ Rezept hinzufügen</button></div>`).join('')}</section>`;
 }).join('')}</div><p class="footer-note">Änderungen werden online gespeichert. Beim Übernehmen in die Einkaufsliste wird die Portionszahl dieses Rezepts dort gesetzt.</p>`;
}
function repaint(){const root=document.getElementById('weeklyPlan');if(root)root.innerHTML=content();}
function close(){if(busy)return;modal?.close();modal?.remove();modal=null;opener?.focus();}
function open(day,slot,entry,initial={}){
 if(modal||!recipes.length)return;opener=document.activeElement;
 modal=document.createElement('dialog');modal.className='wp-dialog';modal.setAttribute('aria-labelledby','wpTitle');
 modal.innerHTML=`<div class="wp-dialog-body"><div class="wp-dialog-header"><h2 id="wpTitle">${entry?'Planung bearbeiten':'Gericht einplanen'}</h2><button class="btn btn-soft" type="button" data-week-close>Schließen</button></div><form id="weeklyPlanForm" class="plan-form"><label>Rezept suchen<input class="field" type="search" id="wpSearch" placeholder="Rezeptname eingeben …"></label><label>Rezept<select class="field" name="recipe_id" required>${recipes.map(r=>`<option value="${esc(r.id)}" ${(entry?.recipe_id||initial.recipe_id)===r.id?'selected':''}>${esc(r.title)}</option>`).join('')}</select></label><div class="plan-grid"><label>Tag<input class="field" name="planned_on" type="date" required value="${esc(day)}"></label><label>Mahlzeit<select class="field" name="meal_slot"><option value="mittag" ${slot==='mittag'?'selected':''}>Mittagessen</option><option value="abend" ${slot==='abend'?'selected':''}>Abendessen</option></select></label></div><label>Portionen<input class="field" name="servings" type="number" min="1" max="30" required value="${entry?.servings||initial.servings||people}"></label><label>Notiz (optional)<input class="field" name="note" maxlength="500" value="${esc(entry?.note||'')}" placeholder="Zum Beispiel: Reste für morgen einplanen"></label><button class="btn btn-primary" type="submit">${entry?'Änderungen speichern':'In Wochenplan eintragen'}</button><p id="wpFormStatus" role="status"></p></form></div>`;
 document.body.append(modal);modal.showModal();
 modal.addEventListener('cancel',e=>{e.preventDefault();close()});modal.querySelector('[data-week-close]').addEventListener('click',close);
 modal.querySelector('#wpSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLocaleLowerCase('de');const select=modal.querySelector('[name="recipe_id"]'),old=select.value;const found=recipes.filter(r=>r.title.toLocaleLowerCase('de').includes(q));select.innerHTML=found.map(r=>`<option value="${esc(r.id)}" ${old===r.id?'selected':''}>${esc(r.title)}</option>`).join('');modal.querySelector('#wpFormStatus').textContent=found.length?'':'Kein passendes Rezept gefunden.';});
 modal.querySelector('form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const fd=new FormData(e.target),payload={recipe_id:String(fd.get('recipe_id')||''),planned_on:String(fd.get('planned_on')||''),meal_slot:String(fd.get('meal_slot')||''),servings:Number(fd.get('servings')),note:String(fd.get('note')||'').trim()};
 const status=modal.querySelector('#wpFormStatus');
 if(!recipes.some(r=>r.id===payload.recipe_id)||!/^\d{4}-\d{2}-\d{2}$/.test(payload.planned_on)||iso(date(payload.planned_on))!==payload.planned_on||!['mittag','abend'].includes(payload.meal_slot)||!Number.isInteger(payload.servings)||payload.servings<1||payload.servings>30){status.textContent='Bitte Rezept, Datum und Portionen prüfen.';return;}
 busy=true;modal.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);status.textContent='Wird gespeichert …';
 try{const record=await window.FAMILY_CLOUD.savePlan(payload,entry?.id);plans=plans.filter(p=>p.id!==record.id);plans.push(record);week=monday(record.planned_on);message='Gespeichert – der Eintrag ist im Familienplan.';busy=false;close();repaint();initial.onSaved?.();}
 catch(error){status.textContent=error.message;busy=false;modal.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);}
 });
}
window.WEEK_PLAN={openRecipe(recipeId,servings,context={}){if(context.recipes){recipes=context.recipes;plans=context.plans||[];people=context.people||5}const recipe=recipes.find(r=>r.id===recipeId);if(!recipe)return;open(today(),recipe.category==='abend'?'abend':'mittag',undefined,{recipe_id:recipeId,servings,onSaved:context.onSaved});},render(nextRecipes,nextPlans,nextPeople){recipes=nextRecipes;plans=nextPlans||[];people=nextPeople;return `<div class="screen wp-screen" id="weeklyPlan">${content()}</div>`;},dates:{iso,shift,monday},clear(){busy=false;close();plans=[];recipes=[];}};
document.addEventListener('change',e=>{if(e.target.matches('[data-week-date]')&&/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){week=monday(e.target.value);message='';repaint();}});
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-week]');if(!el||busy)return;const action=el.dataset.week;
 if(action==='prev'||action==='next'||action==='today'){week=action==='today'?monday(today()):shift(week,action==='prev'?-7:7);message='';repaint();return;}
 if(action==='add'){open(el.dataset.day,el.dataset.slot);return;}
 const entry=plans.find(p=>p.id===el.dataset.planId);if(!entry)return;
 if(action==='edit'){open(entry.planned_on,entry.meal_slot,entry);return;}
 if(action==='remove'&&confirm('Dieses Gericht aus dem Wochenplan entfernen? Das Rezept bleibt erhalten.')){
 busy=true;el.disabled=true;try{await window.FAMILY_CLOUD.deletePlan(entry.id);plans=plans.filter(p=>p.id!==entry.id);message='Eintrag entfernt.';}catch(error){message=error.message;}finally{busy=false;repaint();}
 }
});
})();
