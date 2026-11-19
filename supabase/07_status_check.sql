-- Familienküche: reine Statusprüfung, ändert KEINE Daten.
-- Im Supabase SQL Editor starten, nachdem 01/02/03 ausgeführt wurden.
select 'Familien' as pruefung, count(*)::text as ergebnis from public.families
union all select 'Rezepte',count(*)::text from public.recipes
union all select 'Owner',count(*)::text from public.family_members where role='owner'
union all select 'Mitglieder gesamt',count(*)::text from public.family_members;
