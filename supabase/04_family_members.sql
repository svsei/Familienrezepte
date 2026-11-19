-- SCHRITT 4: Zuerst Familienmitglieder in Authentication > Users einladen.
-- Danach pro Person ausführen, eigene echte E-Mail in untenstehenden Platzhalter eintragen.
-- Ohne Eintrag in family_members erhält die Person KEINEN Datenzugriff.
do $$
declare v_user uuid; v_family uuid;
begin
  select id into v_user from auth.users where lower(email)=lower('MITGLIED_EMAIL_HIER_EINTRAGEN');
  if v_user is null then raise exception 'Benutzer fehlt. Zuerst unter Authentication > Users einladen.'; end if;
  select id into strict v_family from public.families;
  insert into public.family_members(family_id,user_id,role,display_name)
    values (v_family,v_user,'member','Familienmitglied')
    on conflict (family_id,user_id) do nothing;
end $$;
-- Entfernen einer Person (aus SQL Editor, nicht in der Web-App):
-- delete from public.family_members where user_id = (select id from auth.users where lower(email) = lower('EMAIL_DER_PERSON'));
