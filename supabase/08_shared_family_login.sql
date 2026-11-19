-- OPTIONALER SCHRITT: gemeinsames Familienkonto als Mitglied zuordnen.
-- Vorher in Supabase > Authentication > Users > Add user > Create new user
-- einen SEPARATEN User mit E-Mail und starkem Passwort erstellen.
-- "Auto Confirm User" aktivieren, falls angeboten. Keine Einladung/E-Mail nötig.
-- KEIN Passwort, secret key oder Service-Role-Schlüssel in SQL einfügen.
-- Ersetze unten die E-Mail exakt durch die neue Adresse.
DO $$
DECLARE
  v_user uuid;
  v_family uuid;
  v_family_count integer;
BEGIN
  SELECT count(*) INTO v_family_count FROM public.families;
  IF v_family_count <> 1 THEN
    RAISE EXCEPTION 'Erwartet genau 1 Familie; gefunden: %', v_family_count;
  END IF;
  SELECT id INTO STRICT v_family FROM public.families;
  SELECT id INTO v_user FROM auth.users
    WHERE lower(email) = lower('FAMILIENKONTO_EMAIL_HIER_EINTRAGEN');
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Das Familienkonto existiert noch nicht in auth.users';
  END IF;
  INSERT INTO public.family_members(family_id,user_id,role,display_name)
  VALUES(v_family,v_user,'member','Familienzugang')
  ON CONFLICT (family_id,user_id) DO NOTHING;
END $$;
-- Kontrolle: zeigt E-Mail und Rolle aller Mitglieder
SELECT u.email, fm.role, fm.display_name
FROM public.family_members fm JOIN auth.users u ON fm.user_id=u.id
ORDER BY fm.created_at;
