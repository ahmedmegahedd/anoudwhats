-- Part 10: Authentication, RLS, Settings table, Avatars bucket

-- ══════════════════════════════════════════════════════════════════════
-- ── Auto-create profile on signup ─────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, availability)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'agent'),
    'offline'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════
-- ── App Settings table ────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════════════
-- ── Avatars bucket ────────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatars public read'
  ) then
    create policy "Avatars public read"
      on storage.objects for select
      to public
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatars authenticated write'
  ) then
    create policy "Avatars authenticated write"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'avatars');
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- ── Enable RLS ────────────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table teams enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table wa_templates enable row level security;
alter table internal_templates enable row level security;
alter table attachments enable row level security;
alter table ready_docs enable row level security;
alter table campaigns enable row level security;
alter table automation_rules enable row level security;
alter table automation_logs enable row level security;
alter table app_settings enable row level security;

-- ══════════════════════════════════════════════════════════════════════
-- ── Policies ──────────────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════

-- Profiles
drop policy if exists "Profiles are viewable by authenticated users" on profiles;
create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated
  using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id);

-- All other tables: authenticated read access (writes go through NestJS service_role)
drop policy if exists "Authenticated read access" on teams;
create policy "Authenticated read access" on teams for select to authenticated using (true);

drop policy if exists "Authenticated read access" on contacts;
create policy "Authenticated read access" on contacts for select to authenticated using (true);

drop policy if exists "Authenticated read access" on conversations;
create policy "Authenticated read access" on conversations for select to authenticated using (true);

drop policy if exists "Authenticated read access" on messages;
create policy "Authenticated read access" on messages for select to authenticated using (true);

drop policy if exists "Authenticated read access" on wa_templates;
create policy "Authenticated read access" on wa_templates for select to authenticated using (true);

drop policy if exists "Authenticated read access" on internal_templates;
create policy "Authenticated read access" on internal_templates for select to authenticated using (true);

drop policy if exists "Authenticated read access" on attachments;
create policy "Authenticated read access" on attachments for select to authenticated using (true);

drop policy if exists "Authenticated read access" on ready_docs;
create policy "Authenticated read access" on ready_docs for select to authenticated using (true);

drop policy if exists "Authenticated read access" on campaigns;
create policy "Authenticated read access" on campaigns for select to authenticated using (true);

drop policy if exists "Authenticated read access" on automation_rules;
create policy "Authenticated read access" on automation_rules for select to authenticated using (true);

drop policy if exists "Authenticated read access" on automation_logs;
create policy "Authenticated read access" on automation_logs for select to authenticated using (true);

drop policy if exists "Authenticated read access" on app_settings;
create policy "Authenticated read access" on app_settings for select to authenticated using (true);
