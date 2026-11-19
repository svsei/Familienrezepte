-- Familienküche Cloud v2 – auf einem NEUEN, eigenen Supabase-Projekt ausführen.
-- RLS ist bei jeder clientseitig erreichbaren Tabelle Pflicht.
-- Keine service_role Schlüssel in der Web-App verwenden.
begin;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','member')),
  display_name text not null default 'Familienmitglied' check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key(family_id,user_id)
);
create index if not exists family_members_user_idx on public.family_members(user_id,family_id);

-- Sicherheitsfunktionen umgehen nur für die Membership-Prüfung die Rekursion der Members-RLS.
-- Auf Auth-Identität aus auth.uid() statt editierbare Benutzer-Metadaten prüfen.
create or replace function public.is_family_member(p_family_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = (select auth.uid())
  );
$$;
create or replace function public.is_family_owner(p_family_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = (select auth.uid()) and fm.role = 'owner'
  );
$$;
revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.is_family_owner(uuid) from public, anon;
grant execute on function public.is_family_member(uuid), public.is_family_owner(uuid) to authenticated;

create table if not exists public.recipes (
  id text not null check(char_length(id) between 1 and 80),
  family_id uuid not null references public.families(id) on delete cascade,
  data jsonb not null check(jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key(id,family_id)
);
create index if not exists recipes_family_idx on public.recipes(family_id);
create table if not exists public.shopping_recipes (
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id text not null,
  servings integer not null check(servings between 1 and 30),
  updated_at timestamptz not null default now(),
  primary key(family_id,recipe_id),
  foreign key(recipe_id,family_id) references public.recipes(id,family_id) on delete cascade
);
create table if not exists public.shopping_custom (
  id text primary key check(char_length(id) between 1 and 64),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 100),
  qty numeric(12,2) not null default 1 check(qty > 0 and qty <= 1000000),
  unit text not null default 'Stk' check(char_length(unit) between 1 and 24),
  created_at timestamptz not null default now()
);
create index if not exists shopping_custom_family_idx on public.shopping_custom(family_id);
create table if not exists public.shopping_checks (
  family_id uuid not null references public.families(id) on delete cascade,
  item_key text not null check(char_length(item_key) between 1 and 250),
  checked boolean not null default false,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(family_id,item_key)
);
create table if not exists public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id text not null,
  planned_on date not null,
  meal_slot text not null default 'abend' check (meal_slot in ('mittag','abend')),
  servings integer not null default 5 check(servings between 1 and 30),
  note text not null default '' check(char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key(recipe_id,family_id) references public.recipes(id,family_id) on delete cascade
);
create index if not exists meal_plan_family_date_idx on public.meal_plan(family_id,planned_on);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_recipes enable row level security;
alter table public.shopping_custom enable row level security;
alter table public.shopping_checks enable row level security;
alter table public.meal_plan enable row level security;

-- Standardrechte in public können je nach Supabase-Projekt automatisch offen sein.
revoke all on table public.families, public.family_members, public.recipes,
  public.shopping_recipes, public.shopping_custom, public.shopping_checks,
  public.meal_plan from anon, authenticated;
grant select on public.families, public.family_members, public.recipes to authenticated;
grant insert, update, delete on public.recipes to authenticated; -- nur Familien-Owner per RLS
grant select, insert, update, delete on public.shopping_recipes,
  public.shopping_custom, public.shopping_checks, public.meal_plan to authenticated;

create policy families_read on public.families for select to authenticated
  using ((select public.is_family_member(id)));
create policy members_read on public.family_members for select to authenticated
  using ((select public.is_family_member(family_id)));
-- Keine INSERT/UPDATE/DELETE Policies für family_members: nur über SQL-Editor/Admin.
create policy recipes_read on public.recipes for select to authenticated
  using ((select public.is_family_member(family_id)));
create policy recipes_insert on public.recipes for insert to authenticated
  with check ((select public.is_family_owner(family_id)) and data->>'id'=id);
create policy recipes_update on public.recipes for update to authenticated
  using ((select public.is_family_owner(family_id)))
  with check ((select public.is_family_owner(family_id)) and data->>'id'=id);
create policy recipes_delete on public.recipes for delete to authenticated
  using ((select public.is_family_owner(family_id)));

create policy sr_read on public.shopping_recipes for select to authenticated
  using ((select public.is_family_member(family_id)));
create policy sr_insert on public.shopping_recipes for insert to authenticated
  with check ((select public.is_family_member(family_id)));
create policy sr_update on public.shopping_recipes for update to authenticated
  using ((select public.is_family_member(family_id)))
  with check ((select public.is_family_member(family_id)));
create policy sr_delete on public.shopping_recipes for delete to authenticated
  using ((select public.is_family_member(family_id)));

create policy sc_read on public.shopping_custom for select to authenticated
  using ((select public.is_family_member(family_id)));
create policy sc_insert on public.shopping_custom for insert to authenticated
  with check ((select public.is_family_member(family_id)));
create policy sc_update on public.shopping_custom for update to authenticated
  using ((select public.is_family_member(family_id)))
  with check ((select public.is_family_member(family_id)));
create policy sc_delete on public.shopping_custom for delete to authenticated
  using ((select public.is_family_member(family_id)));

create policy checks_read on public.shopping_checks for select to authenticated
  using ((select public.is_family_member(family_id)));
create policy checks_insert on public.shopping_checks for insert to authenticated
  with check ((select public.is_family_member(family_id)) and updated_by=(select auth.uid()));
create policy checks_update on public.shopping_checks for update to authenticated
  using ((select public.is_family_member(family_id)))
  with check ((select public.is_family_member(family_id)) and updated_by=(select auth.uid()));
create policy checks_delete on public.shopping_checks for delete to authenticated
  using ((select public.is_family_member(family_id)));

create policy plan_read on public.meal_plan for select to authenticated
  using ((select public.is_family_member(family_id)));
create policy plan_insert on public.meal_plan for insert to authenticated
  with check ((select public.is_family_member(family_id)));
create policy plan_update on public.meal_plan for update to authenticated
  using ((select public.is_family_member(family_id)))
  with check ((select public.is_family_member(family_id)));
create policy plan_delete on public.meal_plan for delete to authenticated
  using ((select public.is_family_member(family_id)));

-- Gemeinsame Einkaufsliste in einer DB-Transaktion vollständig zurücksetzen.
create or replace function public.clear_family_shopping(p_family_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not (select public.is_family_member(p_family_id)) then
    raise exception 'Nicht berechtigt.' using errcode = '42501';
  end if;
  delete from public.shopping_checks where family_id = p_family_id;
  delete from public.shopping_custom where family_id = p_family_id;
  delete from public.shopping_recipes where family_id = p_family_id;
end;
$$;
revoke all on function public.clear_family_shopping(uuid) from public, anon;
grant execute on function public.clear_family_shopping(uuid) to authenticated;

-- Realtime: keine PUBLIC Freigabe; jede Change-Subscription wird durch RLS autorisiert.
-- Nur wenn die Tabellen noch nicht in der Publication stehen (neues Projekt empfohlen):
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shopping_recipes') then
    alter publication supabase_realtime add table public.shopping_recipes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shopping_custom') then
    alter publication supabase_realtime add table public.shopping_custom;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shopping_checks') then
    alter publication supabase_realtime add table public.shopping_checks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='meal_plan') then
    alter publication supabase_realtime add table public.meal_plan;
  end if;
end $$;
commit;
