// The privileged client is server-only. Every operation verifies the current family owner first.
export function createHandler({env,createClient,now=Date.now}){
 const recent=new Map();
 return async request=>{
  const origin=request.headers.get('origin');
  const allowed='https://familienrezepte.actualflour4.chatgpt.site';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===allowed)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  const fail=(status,error)=>reply(status,{error});
  if(origin&&origin!==allowed)return fail(403,'Diese Website ist nicht freigegeben.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return fail(405,'Bitte POST verwenden.');
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return fail(401,'Bitte erneut anmelden.');
  const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!secret)return fail(503,'Die Benutzerverwaltung ist serverseitig noch nicht eingerichtet.');
  try{
   const options={auth:{persistSession:false,autoRefreshToken:false}};
   const caller=createClient(url,anon,{...options,global:{headers:{Authorization:'Bearer '+token}}});
   const auth=await caller.auth.getUser(token);
   if(auth.error||!auth.data?.user)return fail(401,'Deine Sitzung ist abgelaufen. Bitte erneut anmelden.');
   const reader=request.body?.getReader();if(!reader)return fail(400,'Die Anfrage fehlt.');
   let size=0,parts=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8000){await reader.cancel();return fail(413,'Die Anfrage ist zu groß.');}parts.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
   let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return fail(400,'Die Anfrage ist ungültig.');}
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   if(!body||!uuid.test(body.familyId)||!['list','invite','create','existing','remove'].includes(body.action))return fail(400,'Ungültige Aktion oder Familie.');
   const userId=auth.data.user.id;
   const permission=await caller.from('family_members').select('role').eq('family_id',body.familyId).eq('user_id',userId).maybeSingle();
   if(permission.error)return fail(502,'Die Administratorberechtigung konnte nicht geprüft werden.');
   if(permission.data?.role!=='owner')return fail(403,'Nur Familienadministratoren dürfen Benutzer verwalten.');
   const admin=createClient(url,secret,options);
   if(body.action==='list'){
    const members=await admin.from('family_members').select('user_id,display_name,role').eq('family_id',body.familyId).order('created_at');
    if(members.error)return fail(502,'Die Mitglieder konnten nicht geladen werden.');
    const users=[];
    for(const member of members.data){
     const account=await admin.auth.admin.getUserById(member.user_id);
     if(account.error)return fail(502,'Eine E-Mail-Adresse konnte nicht geladen werden. Bitte erneut versuchen.');
     users.push({...member,email:account.data.user.email||'',isSelf:member.user_id===userId,pending:!account.data.user.email_confirmed_at});
    }
    return reply(200,{users});
   }
   const time=now();for(const [id,entry]of recent)if(time-entry.start>=60000)recent.delete(id);
   const entry=recent.get(userId)||{start:time,count:0};if(entry.count>=10)return fail(429,'Bitte kurz warten. Höchstens zehn Änderungen pro Minute.');entry.count++;recent.set(userId,entry);
   if(body.action==='remove'){
    if(!uuid.test(body.userId))return fail(400,'Ungültiger Benutzer.');
    if(body.userId===userId)return fail(409,'Den eigenen Zugang kannst du hier nicht entfernen.');
    // The role predicate also prevents deletion if the target was promoted since listing.
    const removed=await admin.from('family_members').delete().eq('family_id',body.familyId).eq('user_id',body.userId).eq('role','member').select('user_id');
    if(removed.error)return fail(502,'Der Familienzugang konnte nicht entfernt werden.');
    if(removed.data?.length!==1)return fail(409,'Dieser Zugang fehlt bereits oder ist als Administrator geschützt. Bitte Liste aktualisieren.');
    return reply(200,{message:'Der Benutzer wurde aus der Familie entfernt. Sein Konto bleibt bestehen; neue Zugriffe auf diese Familie sind gesperrt.'});
   }
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   const displayName=typeof body.displayName==='string'?body.displayName.trim():'';
   if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||!displayName||displayName.length>80)return fail(400,'Bitte gültige E-Mail-Adresse und einen Namen mit maximal 80 Zeichen eingeben.');
   let targetId;
   if(body.action==='invite'){
    const invited=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:allowed+'/'});
    if(invited.error){
     if(['email_exists','user_already_exists'].includes(invited.error.code))return fail(409,'Dieser Zugang ist bereits bestätigt. Bitte „Vorhandenen Zugang zuordnen“ wählen. Ein neues Passwort kann das Mitglied über „Passwort vergessen“ setzen.');
     if(invited.error.code==='email_address_not_authorized')return fail(503,'Supabase erlaubt den E-Mail-Versand an diese Adresse noch nicht. Bitte einen eigenen SMTP-Maildienst in Supabase unter Authentication → Email einrichten.');
     if(invited.error.status===429)return fail(429,'Das E-Mail-Versandlimit ist erreicht. Bitte später erneut einladen.');
     return fail(502,'Die Einladung konnte nicht versendet werden. Bitte E-Mail-Adresse und Supabase-Mailversand (SMTP) prüfen.');
    }
    targetId=invited.data.user?.id;
   }else if(body.action==='create'){
    if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return fail(400,'Das Passwort muss 12 bis 128 Zeichen enthalten.');
    const created=await admin.auth.admin.createUser({email,password:body.password,email_confirm:true});
    if(created.error){
     if(['email_exists','user_already_exists'].includes(created.error.code))return fail(409,'Dieses Konto existiert bereits. Nutze „Vorhandenen Zugang zuordnen“; sein Passwort bleibt unverändert.');
     if(created.error.code==='weak_password')return fail(400,'Supabase hat das Passwort abgelehnt. Bitte ein stärkeres Passwort wählen.');
     return fail(502,'Das Konto konnte nicht erstellt werden. Prüfe die E-Mail-Adresse oder ordne einen bereits vorhandenen Zugang zu.');
    }
    targetId=created.data.user?.id;
   }else{
    // Search stays server-side: no directory or unrelated account data is returned.
    for(let page=1;page<=100;page++){
     const result=await admin.auth.admin.listUsers({page,perPage:100});
     if(result.error)return fail(502,'Der vorhandene Zugang konnte nicht geprüft werden.');
     targetId=result.data.users.find(u=>u.email?.toLowerCase()===email)?.id;
     if(targetId||result.data.users.length<100)break;
    }
    if(!targetId)return fail(404,'Kein passender Zugang gefunden. Prüfe die Adresse oder wähle „Neuen Zugang erstellen“.');
   }
   if(!targetId)return fail(502,'Das Konto konnte nicht zugeordnet werden.');
   // Never overwrite an existing owner's role or an existing account's password.
   const added=await admin.from('family_members').upsert({family_id:body.familyId,user_id:targetId,role:'member',display_name:displayName},{onConflict:'family_id,user_id',ignoreDuplicates:true});
   if(added.error)return fail(502,'Das Konto existiert, aber die Familienzuordnung ist fehlgeschlagen. Bitte mit „Vorhandenen Zugang zuordnen“ erneut versuchen.');
   return reply(200,{message:body.action==='invite'?'Einladung versendet und Familienzugang zugeordnet. Das Mitglied kann über den Link sein Passwort selbst festlegen.':body.action==='create'?'Benutzer erstellt und als Mitglied hinzugefügt. Anmeldung mit E-Mail und dem vergebenen Passwort ist möglich.':'Vorhandener Zugang zugeordnet. Passwort und bestehende Berechtigungen bleiben unverändert.'});
  }catch{return fail(502,'Verbindung zur Benutzerverwaltung fehlgeschlagen. Bitte Liste aktualisieren, bevor du die Aktion erneut ausführst.');}
 };
}
