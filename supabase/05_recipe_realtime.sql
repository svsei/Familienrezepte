-- Version 3: Echtzeitaktualisierung von Rezepten einschalten.
-- Das öffnet keine Tabellenrechte; die bestehenden RLS-Regeln gelten weiterhin.
do $$
begin
 if not exists (
   select 1 from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname='public' and tablename='recipes'
 ) then
   alter publication supabase_realtime add table public.recipes;
 end if;
end $$;
