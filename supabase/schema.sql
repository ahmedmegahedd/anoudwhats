-- ============================================================
-- Anoud Job CRM — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Teams ────────────────────────────────────────────────────────────────────
create table teams (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  description text,
  color       text        default '#25D366',
  created_at  timestamptz default now()
);

-- ─── Profiles (agents) — extends Supabase auth.users ─────────────────────────
create table profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  full_name    text        not null,
  avatar_url   text,
  role         text        not null default 'agent'
                           check (role in ('admin', 'agent')),
  team_id      uuid        references teams(id) on delete set null,
  availability text        not null default 'offline'
                           check (availability in ('online', 'away', 'offline')),
  max_chats    int         default 10,
  created_at   timestamptz default now()
);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
create table campaigns (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  channel     text,
  source      text,
  budget      numeric,
  start_date  date,
  end_date    date,
  created_by  uuid        references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
create table contacts (
  id                uuid        primary key default uuid_generate_v4(),
  phone             text        unique not null,
  name              text,
  email             text,
  company           text,
  channel           text,
  source            text,
  campaign_id       uuid        references campaigns(id) on delete set null,
  tags              text[]      default '{}',
  pipeline_stage    text        default 'Lead',
  deal_value        numeric,
  assigned_agent_id uuid        references profiles(id) on delete set null,
  created_at        timestamptz default now(),
  last_seen_at      timestamptz
);

-- ─── Conversations ────────────────────────────────────────────────────────────
create table conversations (
  id                  uuid        primary key default uuid_generate_v4(),
  contact_id          uuid        references contacts(id) on delete cascade,
  wa_conversation_id  text,
  status              text        not null default 'open'
                                  check (status in ('open', 'assigned', 'resolved', 'archived')),
  assigned_agent_id   uuid        references profiles(id) on delete set null,
  assigned_team_id    uuid        references teams(id) on delete set null,
  channel             text,
  last_message_at     timestamptz,
  created_at          timestamptz default now()
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
create table messages (
  id              uuid        primary key default uuid_generate_v4(),
  conversation_id uuid        references conversations(id) on delete cascade,
  wa_message_id   text        unique,
  direction       text        not null check (direction in ('inbound', 'outbound')),
  type            text        not null default 'text'
                              check (type in ('text', 'image', 'video', 'audio', 'document', 'template', 'sticker')),
  content         text,
  media_url       text,
  media_mime      text,
  extracted_text  text,
  sent_by         uuid        references profiles(id) on delete set null,
  status          text        default 'sent'
                              check (status in ('sent', 'delivered', 'read', 'failed')),
  created_at      timestamptz default now()
);

-- ─── WhatsApp Templates (synced from Meta) ────────────────────────────────────
create table wa_templates (
  id             uuid        primary key default uuid_generate_v4(),
  meta_id        text        unique not null,
  name           text        not null,
  category       text,
  status         text,
  language       text,
  components     jsonb,
  last_synced_at timestamptz default now()
);

-- ─── Internal Templates (auto-response / quick replies) ──────────────────────
create table internal_templates (
  id           uuid        primary key default uuid_generate_v4(),
  title        text        not null,
  content      text        not null,
  category     text,
  language     text        default 'en',
  trigger_rule jsonb,
  is_auto      boolean     default false,
  created_by   uuid        references profiles(id) on delete set null,
  created_at   timestamptz default now()
);

-- ─── Attachments ──────────────────────────────────────────────────────────────
create table attachments (
  id             uuid        primary key default uuid_generate_v4(),
  message_id     uuid        references messages(id) on delete cascade,
  contact_id     uuid        references contacts(id) on delete set null,
  file_name      text,
  file_type      text        check (file_type in ('image', 'video', 'audio', 'document')),
  mime_type      text,
  storage_path   text,
  file_size      int,
  extracted_text text,
  created_at     timestamptz default now()
);

-- ─── Ready-made Documents ─────────────────────────────────────────────────────
create table ready_docs (
  id         uuid        primary key default uuid_generate_v4(),
  title      text        not null,
  content    text        not null,
  category   text,
  language   text        default 'en',
  created_by uuid        references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── Automation Rules ─────────────────────────────────────────────────────────
create table automation_rules (
  id             uuid        primary key default uuid_generate_v4(),
  name           text        not null,
  is_active      boolean     default true,
  trigger_type   text        not null,
  trigger_config jsonb       default '{}',
  conditions     jsonb       default '[]',
  actions        jsonb       default '[]',
  last_run_at    timestamptz,
  created_by     uuid        references profiles(id) on delete set null,
  created_at     timestamptz default now()
);

-- ─── Automation Logs ──────────────────────────────────────────────────────────
create table automation_logs (
  id              uuid        primary key default uuid_generate_v4(),
  rule_id         uuid        references automation_rules(id) on delete cascade,
  conversation_id uuid        references conversations(id) on delete cascade,
  result          text        check (result in ('success', 'failed')),
  error_message   text,
  created_at      timestamptz default now()
);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index on messages(conversation_id);
create index on messages(created_at desc);
create index on conversations(status);
create index on conversations(last_message_at desc);
create index on contacts(phone);
create index on attachments(file_type);
create index on attachments
  using gin(to_tsvector('english',
    coalesce(extracted_text, '') || ' ' || coalesce(file_name, '')
  ));
