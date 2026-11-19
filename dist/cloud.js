/* Familienküche Cloud – Auth, RLS-geschützte Rezepte und geteilte Daten.
 * Der Browser benutzt ausschließlich einen öffentlich vorgesehenen Supabase publishable key.
 * Die Datenzugriffskontrolle liegt zwingend in Postgres-RLS, nicht in diesem JavaScript.
 */
(()=>{'use strict';
const cfg=window.FAMILY_CONFIG||{};
const root=document.getElementById('screen');
const nav=document.getElementById('bottomNav');
let client=null, user=null, family=null, sub=null, started=false, starting=false, refreshing=false, refreshRequested=false;
let shared={cart:{},checked:{},custom:[],plans:[]}; let recipeRefreshInProgress=false;
let writeQueue=Promise.resolve(), writeCount=0;
let sessionReloadRequested=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setAuthScreen=(title,description,inner='')=>{
  nav.hidden=true;
  document.getElementById('headerMore').hidden=true;
  root.innerHTML=`<section class="auth-layout"><div class="auth-card"><span class="auth-symbol"><img src="logo.svg?v=2" alt="" width="64" height="64"></span><div class="eyebrow">Geschützter Familienbereich</div><h1>${esc(title)}</h1><p>${esc(description)}</p>${inner}</div></section>`;
};
function status(text,kind='ok'){
  let el=document.getElementById('cloudStatus');
  if(!el)return;
  el.textContent=text; el.dataset.kind=kind;
}
function check(result,label){
  if(result?.error){
    const error=result.error;
    throw new Error(label+': '+error.message+
      (error.code?' (Code '+error.code+')':'')+
      (result.status?' [HTTP '+result.status+']':'')+
      (error.details?' – '+error.details:'')+
      (error.hint?' – '+error.hint:''));
  }
  return result?.data;
}
function sessionDetails(){
  return '<p class="small-caption">Angemeldet als '+esc(user?.email||'')+
    '<br>Benutzer-ID: '+esc(user?.id||'')+
    '<br>Projekt: '+esc(new URL(cfg.supabaseUrl).hostname)+'</p>'+
    '<button id="retryAuth" class="btn btn-primary">Erneut prüfen</button> '+
    '<button id="authLogout" class="btn btn-soft">Abmelden</button>';
}
function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'')&&
  /^(sb_publishable_|eyJ)/.test(cfg.supabasePublishableKey||'');}
async function getShared(){
  const id=family.id;
  const [a,b,c,d]=await Promise.all([
    client.from('shopping_recipes').select('recipe_id,servings').eq('family_id',id),
    client.from('shopping_custom').select('id,name,qty,unit').eq('family_id',id),
    client.from('shopping_checks').select('item_key,checked').eq('family_id',id),
    client.from('meal_plan').select('id,recipe_id,planned_on,meal_slot,servings,note').eq('family_id',id).order('planned_on',{ascending:true})
  ]);
  const aData=check(a,'Einkaufsrezepte'), bData=check(b,'Eigene Artikel'), cData=check(c,'Häkchen'),dData=check(d,'Essensplanung');
  return {
    cart:Object.fromEntries(aData.map(x=>[x.recipe_id,x.servings])),
    custom:bData.map(x=>({...x,qty:Number(x.qty)})),
    checked:Object.fromEntries(cData.map(x=>[x.item_key,x.checked])),
    plans:dData
  };
}
async function refreshShared(){
  if(!family)return;
  if(refreshing){refreshRequested=true;return;}
  refreshing=true;
  try {
    const data=await getShared();shared=data;
    if(window.FAMILY_APP)window.FAMILY_APP.applyShared(data);
    status('● Synchronisiert');
  }catch(e){console.warn('Synchronisierung fehlgeschlagen',e);status('● Keine Verbindung','error');}
  finally{refreshing=false;if(refreshRequested){refreshRequested=false;refreshShared()}}
}
async function refreshRecipes(){
  if(!family||recipeRefreshInProgress)return;
  recipeRefreshInProgress=true;
  try{
    const rows=check(await client.from('recipes').select('id,data,recipe_number').eq('family_id',family.id).order('id'),'Rezeptbuch aktualisieren');
    const list=rows.map(r=>({...r.data,recipeNumber:r.recipe_number})).sort((a,b)=>a.category.localeCompare(b.category,'de')||a.title.localeCompare(b.title,'de'));
    const fingerprint=JSON.stringify(list);
    if(fingerprint!==window.LAST_RECIPE_FINGERPRINT){
      window.LAST_RECIPE_FINGERPRINT=fingerprint;
      if(window.FAMILY_APP)window.FAMILY_APP.applyRecipes(list);
      else window.RECIPES=list;
    }
  }catch(e){console.warn('Rezeptaktualisierung fehlgeschlagen',e);status('● Rezept-Sync fehlgeschlagen','error')}
  finally{recipeRefreshInProgress=false}
}
function mutate(fn){
  writeCount++;
  const task=async()=>{
    try{
      if(navigator.onLine===false)throw new Error('Offline – Änderungen benötigen Internet.');
      status('● Speichere …','pending');
      await fn();
    }catch(e){console.error(e);status('● Fehler beim Speichern','error');window.FAMILY_APP?.notify('Nicht gespeichert: '+e.message.slice(0,115));}
    finally{writeCount--;if(writeCount===0)await refreshShared()}
  };
  writeQueue=writeQueue.then(task,task);
  return writeQueue;
}
const api={
  get user(){return user},get family(){return family},get shared(){return shared},
  notify:()=>{},refresh:refreshShared,refreshRecipes,
  async deleteRecipe(id){
    if(family?.role!=='owner')throw Error('Nur Familienadministratoren dürfen Rezepte löschen.');
    if(navigator.onLine===false)throw Error('Zum Löschen ist Internet erforderlich.');
    if(typeof id!=='string'||!id)throw Error('Kein Rezept ausgewählt.');
    const rows=check(await client.from('recipes').delete().eq('family_id',family.id).eq('id',id).select('id'),'Rezept löschen');
    if(rows?.length!==1)throw Error('Das Rezept wurde nicht gelöscht. Es fehlt bereits oder die Berechtigung hat sich geändert.');
    await refreshRecipes();await refreshShared();
    return id;
  },
  async manageUsers(action,payload={}){
    if(family?.role!=='owner')throw Error('Nur Familienadministratoren dürfen Benutzer verwalten.');
    const session=check(await client.auth.getSession(),'Anmeldung prüfen')?.session;
    if(!session)throw Error('Bitte erneut anmelden.');
    let response;
    try{response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/family-users',{
      method:'POST',signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify({...payload,action,familyId:family.id})
    });}catch{throw Error('Verbindung unterbrochen. Bitte zuerst die Mitgliederliste aktualisieren, bevor du erneut hinzufügst oder entfernst.');}
    let data;try{data=await response.json();}catch{throw Error('Die Benutzerverwaltung ist gerade nicht erreichbar.');}
    if(!response.ok)throw Error(data.error||'Benutzerverwaltung fehlgeschlagen (HTTP '+response.status+').');
    return data;
  },
  async recipeChat(messages,draft,signal,action){
    if(!user||!family)throw Error('Bitte zuerst anmelden und eine Familie auswählen.');
    const session=check(await client.auth.getSession(),'Anmeldung prüfen')?.session;
    if(!session)throw Error('Bitte melde dich erneut an.');
    const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/recipe-chat',{
      method:'POST',signal,headers:{'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+session.access_token},
      body:JSON.stringify({messages,draft,familyId:family.id,action})
    });
    let data;try{data=await response.json()}catch{throw Error('Der Rezept-Chat ist gerade nicht erreichbar.');}
    if(!response.ok)throw Error(data.error||'Der Rezept-Chat ist noch nicht verfügbar (HTTP '+response.status+').');
    return data;
  },
  async saveNewRecipe(data){
    if(family?.role!=='owner')throw Error('Nur Familienadministratoren können Rezepte speichern.');
    const validated=window.RECIPE_ADMIN.parse(JSON.stringify(data))[0];
    check(await client.from('recipes').insert({family_id:family.id,id:validated.id,data:validated,updated_at:new Date().toISOString()}).select('id').single(),'Neues Rezept speichern');
    await refreshRecipes();
    return validated.id;
  },
  async publishRecipes(recipes){
    if(family?.role!=='owner')throw Error('Nur Administratoren können Rezepte veröffentlichen.');
    if(navigator.onLine===false)throw Error('Zum Veröffentlichen ist Internet erforderlich.');
    for(const data of recipes){
      check(await client.from('recipes').upsert({family_id:family.id,id:data.id,data,updated_at:new Date().toISOString()},{onConflict:'id,family_id'}),'Rezept veröffentlichen');
    }
    await refreshRecipes();
    return recipes.length;
  },
  async uploadRecipePhoto(file){
    if(family?.role!=='owner')throw Error('Nur Administratoren dürfen Bilder hochladen.');
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4_000_000)throw Error('Nur JPG, PNG oder WebP bis 4 MB.');
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const name=family.id+'/'+crypto.randomUUID()+'.'+extension;
    check(await client.storage.from('recipe-images').upload(name,file,{cacheControl:'3600',contentType:file.type,upsert:false}),'Bild hochladen');
    return client.storage.from('recipe-images').getPublicUrl(name).data.publicUrl;
  },
  upsertCart(id,servings){return mutate(async()=>{check(await client.from('shopping_recipes').upsert({family_id:family.id,recipe_id:id,servings},{onConflict:'family_id,recipe_id'}),'Rezept hinzufügen')})},
  removeCart(id){return mutate(async()=>{check(await client.from('shopping_checks').delete().eq('family_id',family.id),'Häkchen zurücksetzen');check(await client.from('shopping_recipes').delete().eq('family_id',family.id).eq('recipe_id',id),'Rezept entfernen')})},
  setCheck(key,checked){return mutate(async()=>{check(await client.from('shopping_checks').upsert({family_id:family.id,item_key:key,checked,updated_by:user.id},{onConflict:'family_id,item_key'}),'Häkchen speichern')})},
  async addCustom(item){return mutate(async()=>{check(await client.from('shopping_custom').insert({family_id:family.id,...item}),'Artikel hinzufügen')})},
  removeCustom(id){return mutate(async()=>{check(await client.from('shopping_custom').delete().eq('family_id',family.id).eq('id',id),'Artikel entfernen')})},
  resetChecks(){return mutate(async()=>{check(await client.from('shopping_checks').delete().eq('family_id',family.id),'Häkchen löschen')})},
  clearShopping(){return mutate(async()=>{check(await client.rpc('clear_family_shopping',{p_family_id:family.id}),'Einkaufsliste leeren')})},
  async savePlan(payload,id){
    if(!family||!user)throw Error('Bitte erneut anmelden.');
    if(navigator.onLine===false)throw Error('Zum Speichern ist Internet erforderlich.');
    const fields={recipe_id:payload.recipe_id,planned_on:payload.planned_on,meal_slot:payload.meal_slot,servings:payload.servings,note:payload.note||''};
    const query=id?client.from('meal_plan').update(fields).eq('family_id',family.id).eq('id',id):client.from('meal_plan').insert({...fields,family_id:family.id});
    const row=check(await query.select('id,recipe_id,planned_on,meal_slot,servings,note').single(),'Wochenplan speichern');
    await refreshShared();return row;
  },
  async deletePlan(id){
    if(!family||!user)throw Error('Bitte erneut anmelden.');
    if(navigator.onLine===false)throw Error('Zum Entfernen ist Internet erforderlich.');
    const rows=check(await client.from('meal_plan').delete().eq('family_id',family.id).eq('id',id).select('id'),'Wochenplan ändern');
    if(rows?.length!==1)throw Error('Eintrag fehlt bereits oder die Berechtigung hat sich geändert. Bitte synchronisieren.');
    await refreshShared();
  },
  addPlan(p){return mutate(async()=>{check(await client.from('meal_plan').insert({family_id:family.id,...p}),'Essensplan ergänzen')})},
  removePlan(id){return mutate(async()=>{check(await client.from('meal_plan').delete().eq('family_id',family.id).eq('id',id),'Eintrag entfernen')})},
  async logout(){
    if(sub)await client.removeChannel(sub);
    const key='familienkueche.cloud.v2.'+user.id;
    localStorage.removeItem(key);
    await client.auth.signOut();location.replace(location.pathname);
  }
};
window.FAMILY_CLOUD=api;
function subscribe(){
  if(sub)client.removeChannel(sub);
  const f=`family_id=eq.${family.id}`;
  sub=client.channel('familienkueche-'+family.id);
  sub.on('postgres_changes',{event:'*',schema:'public',table:'recipes',filter:f},()=>refreshRecipes());
  for(const table of ['shopping_recipes','shopping_custom','shopping_checks','meal_plan']){
    // Kein Filter bei DELETE: Postgres Changes liefern bei DELETE unter RLS nur Schlüssel.
    // Auch bei DELETE wird anschließend die gesamte RLS-gefilterte Liste erneut geladen.
    sub.on('postgres_changes',{event:'*',schema:'public',table,filter:f},()=>refreshShared());
  }
  sub.subscribe(statusValue=>{
    if(statusValue==='SUBSCRIBED')status('● Synchronisiert');
    if(statusValue==='CHANNEL_ERROR'||statusValue==='TIMED_OUT')status('● Live-Verbindung unterbrochen','error');
  });
}
async function startSession(session,selectedFamilyId){
  if(starting){sessionReloadRequested=true;return;}
  if(started&&user?.id!==session?.user?.id){location.reload();return;}
  if(!session?.user){login();return;}
  starting=true;
  user=session.user;
  setAuthScreen('Familie wird geladen …','Deine Berechtigung und das Rezeptbuch werden geprüft.');
  try{
    let memberships=check(await client.from('family_members').select('family_id,role').eq('user_id',session.user.id),'Familienmitgliedschaft laden');
    if(!memberships.length){
      setAuthScreen('Keine Familienmitgliedschaft sichtbar',
        'Für dieses angemeldete Konto liefert Supabase keine Mitgliedschaft. Prüfe die Benutzer-ID und das Projekt unten. Auch eine RLS-Regel kann Datensätze ausblenden.',sessionDetails());
      return;
    }
    let membership=memberships.find(m=>m.family_id===(selectedFamilyId||family?.id));
    if(!membership&&memberships.length>1){
      setAuthScreen('Familie auswählen','Dein Konto gehört zu mehreren Familien.',
        memberships.map(m=>'<button class="btn btn-soft" data-family-id="'+esc(m.family_id)+'">Familie '+esc(m.family_id)+'</button>').join('')+sessionDetails());
      return;
    }
    membership=membership||memberships[0];
    family={id:membership.family_id,role:membership.role};
    const familyRows=check(await client.from('families').select('id,name').eq('id',family.id).maybeSingle(),'Zugehörige Familie laden');
    if(!familyRows)throw new Error('Die Mitgliedschaft ist sichtbar, aber die zugehörige Familie '+family.id+' ist nicht lesbar oder fehlt.');
    family.name=familyRows.name;
    const recipeRows=check(await client.from('recipes').select('id,data,recipe_number').eq('family_id',family.id).order('id'),'Rezeptbuch');
    window.RECIPES=recipeRows.map(x=>({...x.data,recipeNumber:x.recipe_number})).sort((a,b)=>a.category.localeCompare(b.category,'de')||a.title.localeCompare(b.title,'de'));
    window.LAST_RECIPE_FINGERPRINT=JSON.stringify(window.RECIPES);
    shared=await getShared();window.CLOUD_INITIAL_STATE=shared;
    nav.hidden=false;document.getElementById('headerMore').hidden=false;
    if(!started){started=true;root.textContent='';const scr=document.createElement('script');scr.src='app.js?v=4.26';scr.onerror=()=>setAuthScreen('Fehler','App-Code konnte nicht geladen werden.');document.body.appendChild(scr)}
    else if(window.FAMILY_APP){window.FAMILY_APP.applyRecipes(window.RECIPES);window.FAMILY_APP.applyShared(shared)}
    subscribe();status('● Synchronisiert');
  }catch(e){
    status('● Laden fehlgeschlagen','error');
    setAuthScreen('Familienbereich konnte nicht geladen werden',
      'Die Anmeldung ist vorhanden. Beim Laden der Daten ist ein Fehler aufgetreten.',
      '<pre class="error-explainer">'+esc(e.message||String(e))+'</pre>'+sessionDetails());
  }finally{
    starting=false;
    if(sessionReloadRequested){
      sessionReloadRequested=false;
      const {data,error}=await client.auth.getSession();
      if(!error)await startSession(data.session);
    }
  }
}

function login(){
  setAuthScreen('Willkommen in der Familienküche','Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.',
    '<form id="loginForm" class="auth-form">'+
    '<label>E-Mail-Adresse<input class="field" type="email" name="email" autocomplete="username" required></label>'+
    '<label>Passwort<input class="field" type="password" name="password" autocomplete="current-password" required></label>'+
    '<button class="btn btn-primary btn-block" type="submit">Anmelden</button></form>'+
    '<p id="loginInfo" class="small-caption" role="status" aria-live="polite"></p>'+
    '<button id="forgotPassword" type="button" class="btn btn-soft">Passwort vergessen?</button>');
}
function forgotPassword(){
  const email=document.querySelector('#loginForm [name="email"]')?.value||'';
  setAuthScreen('Passwort vergessen?','Du erhältst einen Link per E-Mail, mit dem du ein neues Passwort festlegen kannst.',
    '<form id="resetRequestForm" class="auth-form"><label>E-Mail-Adresse<input class="field" type="email" name="email" autocomplete="username" value="'+esc(email)+'" required></label><button class="btn btn-primary btn-block" type="submit">Link zum Zurücksetzen senden</button></form><p id="resetRequestInfo" class="small-caption" role="status" aria-live="polite"></p><button id="backToLogin" class="btn btn-soft" type="button">Zur Anmeldung</button>');
}
async function boot(){
  if(!configured()){
    setAuthScreen('Einrichtung erforderlich','In config.js fehlen noch Supabase-Projekt-URL und Publishable Key. Siehe README_SETUP.md.');return;
  }
  if(!window.supabase?.createClient){setAuthScreen('Bibliothek nicht erreichbar','Die Anmelde-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.');return;}
  if(await window.FAMILY_RESET.handle(cfg))return;
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,flowType:'implicit'}});
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){window.RECIPE_CHAT?.clear();window.USER_ADMIN?.clear();window.WEEK_PLAN?.clear();location.replace(location.pathname)}
    else if(event==='SIGNED_IN')setTimeout(()=>startSession(session),0);
  });
  const {data,error}=await client.auth.getSession();
  if(error){setAuthScreen('Anmeldung fehlgeschlagen',error.message);return;}
  if(data.session){await startSession(data.session)}else login();
}
document.addEventListener('submit',async e=>{
  if(e.target.id==='resetRequestForm'){
    e.preventDefault();if(!client)return;const form=e.target;
    const email=String(new FormData(form).get('email')||'').trim().toLowerCase();
    const button=form.querySelector('button'),info=document.getElementById('resetRequestInfo');
    if(button.disabled)return;button.disabled=true;info.textContent='Link wird angefordert …';
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});
      if(error)throw error;
      info.textContent='Falls für diese Adresse ein Konto besteht, erhältst du eine E-Mail. Prüfe auch den Spam-Ordner. Öffne den neuesten Link und lege dein neues Passwort fest.';
    }catch(error){info.textContent='E-Mail konnte nicht angefordert werden: '+String(error.message||'Bitte später erneut versuchen.');button.disabled=false;}
    return;
  }
  if(e.target.id!=='loginForm')return;
  e.preventDefault();if(!client)return;
  const form=e.target;
  const email=String(new FormData(form).get('email')||'').trim().toLowerCase();
  const password=String(new FormData(form).get('password')||'');
  const info=document.getElementById('loginInfo');
  const button=form.querySelector('button[type="submit"]');
  if(!email||!password||!info)return;
  button.disabled=true;info.textContent='Anmeldung wird geprüft …';
  try{
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;
    info.textContent='Angemeldet. Rezeptbuch wird geladen …';
  }catch(error){
    info.textContent='Anmeldung fehlgeschlagen. '+String(error?.message||'');
    button.disabled=false;
  }
});
document.addEventListener('click',e=>{
  if(e.target.id==='forgotPassword')forgotPassword();
  if(e.target.id==='backToLogin')login();
  if(e.target.id==='authLogout')api.logout();
  if(e.target.id==='retryAuth')location.reload();
  const choice=e.target.closest('[data-family-id]');
  if(choice)client.auth.getSession().then(({data,error})=>{
    if(error)setAuthScreen('Sitzung konnte nicht geladen werden',error.message,sessionDetails());
    else startSession(data.session,choice.dataset.familyId);
  });
});
setInterval(()=>{if(started&&document.visibilityState==='visible'&&navigator.onLine){refreshShared();refreshRecipes()}},45000);
window.addEventListener('online',()=>{refreshShared();refreshRecipes()});
window.addEventListener('offline',()=>status('● Offline – nur lesen','error'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&started&&navigator.onLine){refreshShared();refreshRecipes()}});
boot();
})();
