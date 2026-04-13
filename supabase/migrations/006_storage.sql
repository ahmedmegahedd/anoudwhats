-- Part 6: Attachments Library + ATS Search + Ready-Made Documents
-- Storage bucket, policies, attachments media_url column, and full-text search column.

-- ─── Storage bucket ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- ─── Storage policies ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Service role full access'
  ) then
    create policy "Service role full access"
      on storage.objects for all
      to service_role
      using (bucket_id = 'attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read attachments'
  ) then
    create policy "Public read attachments"
      on storage.objects for select
      to public
      using (bucket_id = 'attachments');
  end if;
end $$;

-- ─── attachments.media_url column ─────────────────────────────────────────────
alter table attachments
  add column if not exists media_url text;

-- ─── Generated full-text column for ATS search ────────────────────────────────
alter table attachments
  add column if not exists extracted_text_and_name text
  generated always as (
    coalesce(extracted_text, '') || ' ' || coalesce(file_name, '')
  ) stored;

create index if not exists attachments_search_idx
  on attachments
  using gin (to_tsvector('simple', extracted_text_and_name));
