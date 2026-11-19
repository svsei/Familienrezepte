(()=>{'use strict';
let dialog=null,busy=false,users=[],opener=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(message){if(dialog)dialog.querySelector('#uaStatus').textContent=message;}
function lock(value){busy=value;if(dialog)dialog.querySelectorAll('button,input,select').forEach(e=>{e.disabled=value;});}
function showUsers(){if(!dialog)return;dialog.querySelector('#uaUsers').innerHTML=users.map(u=>`<li class="ua-user"><div><strong>${esc(u.display_name)}</strong><span>${esc(u.email)}</span><small>${u.role==='owner'?'Administrator':'Mitglied'}${u.isSelf?' · Du':''}${u.pending?' · Einladung noch offen':''}</small></div>${u.role==='owner'||u.isSelf?'<span class="small-caption">Geschützt</span>':`<button type="button" class="btn btn-danger" data-remove-user="${esc(u.user_id)}">Entfernen</button>`}</li>`).join('')||'<li>Keine Mitglieder gefunden.</li>';}
async function reload(){const result=await window.FAMILY_CLOUD.manageUsers('list');users=result.users;showUsers();}
function updateMode(){
 const mode=dialog.querySelector('[name="mode"]').value,p=dialog.querySelector('[name="password"]');p.value='';p.required=mode==='create';dialog.querySelector('#uaPasswordLabel').hidden=mode!=='create';
 dialog.querySelector('[type="submit"]').textContent=mode==='invite'?'Einladung senden':'Benutzer hinzufügen';
 dialog.querySelector('#uaModeHint').textContent=mode==='invite'?'Das Mitglied erhält einen Einladungslink und legt sein Passwort selbst fest. Bitte die E-Mail-Adresse genau prüfen.':mode==='existing'?'Ein bestehendes Konto wird hinzugefügt. Sein Passwort bleibt unverändert.':'Es wird keine E-Mail versendet. Bitte die Adresse vor dem Anlegen genau prüfen.';
}
function close(){if(busy)return;dialog?.close();dialog?.remove();dialog=null;users=[];opener?.focus();}
window.USER_ADMIN={async open(){
 if(dialog||window.FAMILY_CLOUD?.family?.role!=='owner')return;
 opener=document.activeElement;dialog=document.createElement('dialog');dialog.className='ua-dialog';dialog.setAttribute('aria-labelledby','uaTitle');
 dialog.innerHTML=`<div class="ua-shell"><header class="ua-header"><div><div class="eyebrow">Familienzugänge</div><h2 id="uaTitle">Benutzerverwaltung</h2></div><button type="button" class="btn btn-soft" data-ua-close>Schließen</button></header><p>Neue Mitglieder können sich mit E-Mail-Adresse und Passwort anmelden. Sie erhalten Zugriff auf eure Familienrezepte, Einkaufslisten und Planung.</p><form id="uaForm" class="ua-form"><h3>Benutzer hinzufügen</h3><label>Zugang<select name="mode"><option value="invite">Einladung per E-Mail senden</option><option value="create">Neuen Zugang erstellen</option><option value="existing">Vorhandenen Zugang zuordnen</option></select></label><label>Name<input name="displayName" required maxlength="80" autocomplete="off" placeholder="Name des Familienmitglieds"></label><label>E-Mail-Adresse<input name="email" type="email" required maxlength="254" autocomplete="off" placeholder="name@beispiel.de"></label><label id="uaPasswordLabel" hidden>Passwort<input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password"><small>Mindestens 12 Zeichen. Gib das Passwort persönlich weiter. Über „Passwort vergessen“ kann das Mitglied später ein eigenes setzen.</small></label><p class="small-caption" id="uaModeHint">Das Mitglied erhält einen Einladungslink und legt sein Passwort selbst fest. Bitte die E-Mail-Adresse genau prüfen.</p><button class="btn btn-primary" type="submit">Einladung senden</button></form><div class="ua-header"><h3>Mitglieder deiner Familie</h3><button type="button" class="btn btn-soft" data-ua-refresh>Aktualisieren</button></div><ul id="uaUsers" class="ua-users"></ul><p class="small-caption">„Entfernen“ löscht die Mitgliedschaft in dieser Familie. Das zentrale Konto und Familienrezepte bleiben erhalten. Administratoren und dein eigener Zugang sind geschützt.</p><p id="uaStatus" role="status" aria-live="polite"></p></div>`;
 document.body.append(dialog);dialog.showModal();
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('[name="mode"]').addEventListener('change',()=>{
  updateMode();
 });
 dialog.addEventListener('click',async e=>{
  if(busy)return;if(e.target.closest('[data-ua-close]')){close();return;}
  const id=e.target.closest('[data-remove-user]')?.dataset.removeUser;
  if(id){const u=users.find(x=>x.user_id===id);if(!u||u.isSelf||u.role==='owner')return;if(!confirm(`${u.display_name} (${u.email}) aus dieser Familie entfernen? Der Familienzugang wird gesperrt. Das Konto bleibt erhalten.`))return;}
  if(!id&&!e.target.closest('[data-ua-refresh]'))return;
  lock(true);status(id?'Familienzugang wird entfernt …':'Mitglieder werden geladen …');
  try{let result;if(id)result=await window.FAMILY_CLOUD.manageUsers('remove',{userId:id});await reload();status(result?.message||'Mitglieder aktualisiert.');}catch(error){status(error.message);}finally{lock(false);}
 });
 dialog.addEventListener('submit',async e=>{
  if(e.target.id!=='uaForm')return;e.preventDefault();if(busy)return;
  const form=e.target,values=new FormData(form),action=values.get('mode');
  const payload={displayName:values.get('displayName'),email:values.get('email')};if(action==='create')payload.password=values.get('password');
  lock(true);status(action==='invite'?'Einladung wird versendet …':'Benutzer wird hinzugefügt …');
  try{const result=await window.FAMILY_CLOUD.manageUsers(action,payload);form.reset();updateMode();status(result.message);try{await reload();}catch{status(result.message+' Die Liste konnte nicht aktualisiert werden. Bitte „Aktualisieren“ wählen.');}}
  catch(error){status(error.message);}finally{payload.password=undefined;form.querySelector('[name="password"]').value='';lock(false);}
 });
 lock(true);status('Mitglieder werden geladen …');try{await reload();status('');}catch(error){status(error.message);}finally{lock(false);}
},clear(){busy=false;close();}};
document.addEventListener('click',e=>{if(e.target.closest('[data-action="open-user-admin"]'))window.USER_ADMIN.open();});
})();
