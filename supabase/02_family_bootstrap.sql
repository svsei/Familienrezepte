-- SCHRITT 2: Nach dem ersten Login/Einladen des Owner-Users, im Supabase SQL Editor ausführen.
-- 'OWNER_EMAIL_HIER_EINTRAGEN' durch die echte E-Mail austauschen.
-- Dieses Script darf NICHT als Public RPC bereitgestellt werden.
do $$
declare v_owner uuid; v_family uuid;
begin
  select id into v_owner from auth.users where lower(email) = lower('OWNER_EMAIL_HIER_EINTRAGEN');
  if v_owner is null then
    raise exception 'Owner fehlt in Authentication > Users. Zuerst dort einen Benutzer einladen.';
  end if;
  insert into public.families(name,created_by) values ('Familienküche', v_owner)
    on conflict (created_by) do update set name = excluded.name returning id into v_family;
  insert into public.family_members(family_id,user_id,role,display_name)
    values (v_family,v_owner,'owner','Familienadministrator')
    on conflict (family_id,user_id) do nothing;
  raise notice 'Familien-ID: %', v_family;
end $$;
