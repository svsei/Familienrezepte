/* Invitation and recovery sessions stay in memory and never load family data. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function screen(title,text,inner=''){
 document.getElementById('bottomNav').hidden=true;
 document.getElementById('headerMore').hidden=true;
 document.getElementById('screen').innerHTML='<section class="auth-layout"><div class="auth-card"><span class="auth-symbol"><img src="logo.svg?v=2" alt="" width="64" height="64"></span><div class="eyebrow">'+(invitation?'Einladung zur Familienküche':'Passwort zurücksetzen')+'</div><h1>'+esc(title)+'</h1><p>'+esc(text)+'</p>'+inner+'</div></section>';
}
let invitation=false;
const back='<a class="btn btn-soft" href="/">Zur Anmeldung</a>';
window.FAMILY_RESET={async handle(cfg){
 const params=new URLSearchParams(location.hash.slice(1));
 invitation=params.get('type')==='invite';
 if(!invitation&&params.get('type')!=='recovery'&&!params.has('error'))return false;
 const access=params.get('access_token'),refresh=params.get('refresh_token');
 history.replaceState(null,'',location.pathname);
 screen('Link wird geprüft …','Einen Moment bitte.');
 if(params.has('error')||!access||!refresh){screen('Link nicht mehr gültig','Bitte öffne die neueste E-Mail. Für eine Einladung bitte den Familienadministrator um einen neuen Link; für ein bestehendes Konto nutze „Passwort vergessen“.',back);return true;}
 const recovery=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}});
 try{
  const session=await recovery.auth.setSession({access_token:access,refresh_token:refresh});
  if(session.error)throw session.error;
  const verified=await recovery.auth.getUser();
  if(verified.error||!verified.data?.user)throw Error('Sitzung konnte nicht bestätigt werden.');
  screen(invitation?'Dein Passwort festlegen':'Neues Passwort festlegen','Für '+verified.data.user.email+'. Verwende mindestens 12 Zeichen.',
   '<form id="newPasswordForm" class="auth-form"><label>Neues Passwort<input class="field" name="password" type="password" autocomplete="new-password" minlength="12" required></label><label>Passwort wiederholen<input class="field" name="confirm" type="password" autocomplete="new-password" minlength="12" required></label><button type="submit" class="btn btn-primary btn-block">Passwort speichern</button></form><p id="resetInfo" class="small-caption" role="status" aria-live="polite"></p>'+back);
  document.getElementById('newPasswordForm').addEventListener('submit',async e=>{
   e.preventDefault();const form=e.target,fd=new FormData(form),password=String(fd.get('password')||''),confirm=String(fd.get('confirm')||'');
   const info=document.getElementById('resetInfo'),button=form.querySelector('button');
   if(button.disabled)return;
   if(password.length<12){info.textContent='Bitte mindestens 12 Zeichen verwenden.';return;}
   if(password!==confirm){info.textContent='Die Passwörter stimmen nicht überein.';return;}
   button.disabled=true;info.textContent='Passwort wird gespeichert …';
   try{
    const {error}=await recovery.auth.updateUser({password});if(error)throw error;
    form.reset();
    await recovery.auth.signOut().catch(()=>{});
    screen(invitation?'Zugang eingerichtet':'Passwort geändert','Melde dich jetzt mit deiner E-Mail-Adresse und dem neuen Passwort an.',back);
   }catch(error){info.textContent='Passwort nicht geändert: '+String(error.message||'Bitte erneut versuchen.');button.disabled=false;}
  });
 }catch{
  screen('Link nicht mehr gültig','Der Link ist abgelaufen, wurde bereits verwendet oder konnte nicht geprüft werden. Bitte den Administrator um eine neue Einladung oder nutze für ein bestehendes Konto „Passwort vergessen“.',back);
 }
 return true;
}};
})();
