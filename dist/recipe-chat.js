/* The API key never enters this file. Chat drafts live only in this page's memory. */
(()=>{'use strict';
let host=null,messages=[],draft=null,busy=false,saved=false,controller=null,opener=null,imageData=null,imageError='',imageBusy=false;
const newId=()=> 'ki-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function note(text){if(host)host.querySelector('#chatNotice').textContent=text;}
async function generateImage(){
 const activeHost=host,activeDraft=draft,abort=new AbortController();controller=abort;
 busy=true;imageBusy=true;imageError='';render();
 const timer=setTimeout(()=>abort.abort(),130000);
 try{
   const result=await window.FAMILY_CLOUD.recipeChat(undefined,activeDraft,abort.signal,'image');
   if(host!==activeHost||draft!==activeDraft)return;
   if(result.mimeType!=='image/jpeg'||typeof result.base64!=='string')throw Error('Die Bildantwort konnte nicht gelesen werden.');
   imageData='data:image/jpeg;base64,'+result.base64;
 }catch(error){if(host===activeHost&&draft===activeDraft)imageError=error.name==='AbortError'?'Die Bilderstellung dauerte zu lange. Bitte erneut versuchen.':error.message;}
 finally{clearTimeout(timer);if(controller===abort)controller=null;if(host===activeHost&&draft===activeDraft){busy=false;imageBusy=false;render();}}
}
function render(){
 if(!host)return;
 const owner=window.FAMILY_CLOUD.family.role==='owner';
 host.innerHTML=`<div class="rc-shell"><header class="rc-header"><div><div class="eyebrow">Gemeinsam neue Ideen kochen</div><h2 id="rcTitle">Rezeptwerkstatt</h2></div><button class="btn btn-soft" type="button" data-chat="close" aria-label="Rezeptwerkstatt schließen">Schließen</button></header><p class="rc-intro">Beschreibe deine Zutaten und Wünsche. Wir entwickeln das Rezept gemeinsam – gespeichert wird erst nach deiner Prüfung.</p><div class="rc-layout"><section aria-label="Rezept-Chat"><div id="chatMessages" class="rc-messages" role="log" aria-live="polite">${messages.length?messages.map(m=>`<div class="rc-message ${m.role}"><strong>${m.role==='user'?'Du':'Rezeptassistent'}</strong><p>${esc(m.content)}</p></div>`).join(''):`<div class="rc-message assistant"><strong>Was möchtest du kochen?</strong><p>Zum Beispiel: Ein mildes Hokkaido-Nudelgericht für 5 Personen, ohne Tomaten, mit dem Thermomix.</p></div>`}</div><form id="recipeChatForm"><label for="recipeChatInput">Deine Nachricht</label><textarea id="recipeChatInput" required maxlength="2000" rows="3" placeholder="Zutaten, Personen, Zeit oder Änderungswünsche …" ${busy?'disabled':''}></textarea><div class="rc-actions"><button type="submit" class="btn btn-primary" ${busy?'disabled':''}>${busy?'Wird entwickelt …':'Nachricht senden'}</button><button type="button" data-chat="reset" class="btn btn-white" ${busy?'disabled':''}>Neuer Chat</button></div></form><p class="small-caption">Deine Nachrichten und der aktuelle Entwurf werden an OpenAI gesendet. Der Chat bleibt nur bis zum Neuladen in diesem Browser. API-Nutzung ist kostenpflichtig. Jeder neue Rezeptentwurf erhält automatisch ein Bild; dafür fallen zusätzliche API-Kosten an.</p></section><section class="rc-preview" aria-label="Rezeptvorschau">${draft?`<div class="eyebrow">${saved?'Gespeichert':'Dein Entwurf'}</div><h3>${esc(draft.title)}</h3><p>${esc(draft.description)}</p>${imageData?`<figure class="rc-image"><img src="${imageData}" alt="KI-generiertes Bild: ${esc(draft.title)}"><figcaption>KI-generierter Serviervorschlag</figcaption></figure>`:''}${imageBusy?'<p role="status">Das passende Rezeptbild wird erstellt …</p>':''}${imageError?`<p class="rc-notice">${esc(imageError)} Das Rezept kannst du auch ohne Bild speichern.</p>`:''}${!imageData&&!imageBusy&&!saved?`<button type="button" class="btn btn-soft" data-chat="image" ${busy?'disabled':''}>Bild ${imageError?'erneut ':''}erstellen</button>`:''}<p class="rc-meta">${draft.minutes} Minuten · ${draft.servings} ${esc(draft.servingLabel)}</p><h4>Zutaten</h4><ul>${draft.ingredients.map(i=>`<li>${esc(i.qty)} ${esc(i.unit)} ${esc(i.name)}${i.optional?' (optional)':''}</li>`).join('')}</ul><h4>Zubereitung</h4><ol>${draft.steps.map(s=>`<li><strong>${esc(s.title)}</strong><p>${esc(s.body)}</p></li>`).join('')}</ol>${draft.note?`<p>${esc(draft.note)}</p>`:''}<p class="small-caption">Bitte Zutaten, Allergene, Mengen und Garzeiten vor dem Speichern prüfen.</p><button class="btn btn-primary btn-block" data-chat="save" ${busy||saved||!owner?'disabled':''}>${saved?'✓ Im Rezeptbuch gespeichert':'Rezept für die Familie speichern'}</button>${!owner?'<p class="small-caption">Du bist als Mitglied angemeldet. Nur Familienadministratoren dürfen neue Rezepte speichern.</p>':''}`:`<div class="eyebrow">Vom Gespräch ins Rezeptbuch</div><h3>Hier entsteht dein Rezept</h3><p>Zutaten und Kochschritte erscheinen hier, sobald ein vollständiger Entwurf vorliegt. Du kannst ihn im Chat weiter verfeinern.</p>`}</section></div><p id="chatNotice" class="rc-notice" role="status" aria-live="polite"></p></div>`;
 host.querySelector('#chatMessages').scrollTop=host.querySelector('#chatMessages').scrollHeight;
}
function close(){controller?.abort();controller=null;busy=false;imageBusy=false;host?.close();host?.remove();host=null;opener?.focus();}
window.RECIPE_CHAT={open(){
 if(!window.FAMILY_CLOUD?.user||!window.FAMILY_CLOUD?.family||host)return;
 opener=document.activeElement;host=document.createElement('dialog');host.className='rc-dialog';host.setAttribute('aria-labelledby','rcTitle');document.body.append(host);
 host.addEventListener('cancel',e=>{e.preventDefault();close();});
 host.addEventListener('click',async e=>{
   const action=e.target.closest('[data-chat]')?.dataset.chat;
   if(action==='close'){close();return;}if(busy)return;
   if(action==='image'&&draft&&!saved){await generateImage();return;}
   if(action==='reset'){if(messages.length&&!confirm('Chat und ungespeicherten Entwurf verwerfen?'))return;messages=[];draft=null;saved=false;imageData=null;imageError='';render();host.querySelector('textarea').focus();}
   if(action==='save'&&draft&&!saved){
     busy=true;render();const activeHost=host;
     try{const savingDraft=draft;
       if(imageData&&!savingDraft.imageUrl){
         const bytes=Uint8Array.from(atob(imageData.split(',')[1]),c=>c.charCodeAt(0));
         savingDraft.imageUrl=await window.FAMILY_CLOUD.uploadRecipePhoto(new File([bytes],'rezept.jpg',{type:'image/jpeg'}));
       }
       await window.FAMILY_CLOUD.saveNewRecipe(savingDraft);saved=true;if(host===activeHost){render();note('Gespeichert. Das Rezept ist jetzt im Rezeptbuch, in der Einkaufsplanung und im Kochmodus verfügbar.');}}
     catch(error){if(host===activeHost){busy=false;render();note(error.message);}}
     finally{busy=false;if(host===activeHost){const b=host.querySelector('[data-chat="save"]');if(b)b.disabled=saved||window.FAMILY_CLOUD.family.role!=='owner';host.querySelector('[type="submit"]').disabled=false;host.querySelector('[type="submit"]').textContent='Nachricht senden';host.querySelector('textarea').disabled=false;host.querySelector('[data-chat="reset"]').disabled=false;}}
   }
 });
 host.addEventListener('submit',async e=>{
   if(e.target.id!=='recipeChatForm')return;e.preventDefault();if(busy)return;
   const text=host.querySelector('textarea').value.trim();if(!text)return;
   const input={role:'user',content:text};messages.push(input);busy=true;render();
   const activeHost=host;const abort=new AbortController();controller=abort;const timer=setTimeout(()=>abort.abort(),70000);
   try{
     const result=await window.FAMILY_CLOUD.recipeChat(messages.slice(-11),draft,abort.signal);
     if(host!==activeHost)return;
     if(typeof result.reply!=='string')throw Error('Die Antwort konnte nicht gelesen werden.');
     let next=null;
     if(result.recipe)next=window.RECIPE_ADMIN.parse(JSON.stringify({...result.recipe,id:newId(),image:'rezept-neu.svg'}))[0];
     messages.push({role:'assistant',content:result.reply});
     if(next){draft=next;saved=false;imageData=null;imageError='';}
     busy=false;render();host.querySelector('textarea').focus();
     clearTimeout(timer);if(next)await generateImage();
   }catch(error){
     if(host!==activeHost)return;
     if(messages.at(-1)===input)messages.pop();busy=false;render();host.querySelector('textarea').value=text;
     note(error.name==='AbortError'?'Die Anfrage wurde abgebrochen oder dauerte zu lange. Du kannst sie erneut senden.':error.message);
   }finally{clearTimeout(timer);if(controller===abort)controller=null;}
 });
 render();host.showModal();host.querySelector('textarea').focus();
},clear(){close();messages=[];draft=null;saved=false;imageData=null;imageError='';}};
document.addEventListener('click',e=>{if(e.target.closest('[data-action="open-recipe-chat"]'))window.RECIPE_CHAT.open();});
})();
