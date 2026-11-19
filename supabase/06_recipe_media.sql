-- Optional für öffentliche Food-Fotos in der Rezeptverwaltung.
-- Diese Fotos sind per öffentlicher URL zugänglich. Keine Personen- oder Privatfotos hochladen.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('recipe-images','recipe-images',true,4000000,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=4000000,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "recipe_images_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id='recipe-images' and exists (
  select 1 from public.family_members fm
  where fm.family_id::text=split_part(name,'/',1) and fm.user_id=(select auth.uid()) and fm.role='owner'
));
-- Ohne UPDATE/DELETE-Policy ist nur Upload neuer, einzigartiger Bildnamen möglich.
commit;
