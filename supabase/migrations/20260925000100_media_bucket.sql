-- Bucket público para imágenes y videos de las publicaciones (Instagram y las demás APIs piden una URL pública).
-- Las rutas llevan un UUID, así que no se pueden adivinar. Solo el servidor (clave secreta) sube archivos.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
    on conflict (id) do nothing;
  end if;
end $$;
