-- OffScript: Initial schema
-- Run this in your Supabase SQL editor or via supabase db push

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  preferred_mode text default 'daily' not null
    check (preferred_mode in ('daily', 'chaos', 'retry', 'interview', 'debate', 'rescue')),
  preferred_difficulty smallint default 1 not null check (preferred_difficulty between 1 and 4),
  streak_count integer default 0 not null,
  last_session_date date,
  onboarding_completed boolean default false not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Prompts ───────────────────────────────────────────────────────────────
create table public.prompts (
  id uuid default uuid_generate_v4() primary key,
  topic text not null,
  category text not null
    check (category in ('society', 'science', 'business', 'ethics', 'history', 'technology', 'culture', 'absurd', 'interview', 'debate')),
  difficulty smallint not null check (difficulty between 1 and 4),
  stance_type text not null check (stance_type in ('open', 'defend', 'explain', 'argue', 'imagine')),
  prompt_text text not null,
  context_bullets jsonb not null default '[]',
  retry_angle text not null,
  tags jsonb not null default '[]',
  active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.prompts enable row level security;

-- All authenticated users can read prompts
create policy "Authenticated users can read prompts"
  on public.prompts for select
  to authenticated
  using (active = true);

create index prompts_category_idx on public.prompts (category);
create index prompts_difficulty_idx on public.prompts (difficulty);
create index prompts_active_idx on public.prompts (active);

-- ─── Sessions ──────────────────────────────────────────────────────────────
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  prompt_id uuid references public.prompts(id) not null,
  mode text not null check (mode in ('daily', 'chaos', 'retry', 'interview', 'debate', 'rescue')),
  difficulty smallint not null check (difficulty between 1 and 4),
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  status text default 'active' not null check (status in ('pending', 'active', 'completed', 'abandoned'))
);

alter table public.sessions enable row level security;

create policy "Users can manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_status_idx on public.sessions (status);

-- ─── Attempts ──────────────────────────────────────────────────────────────
create table public.attempts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  attempt_number smallint default 1 not null,
  video_url text,
  audio_url text,
  transcript text,
  duration_sec integer,
  created_at timestamptz default now() not null
);

alter table public.attempts enable row level security;

create policy "Users can manage own attempts"
  on public.attempts for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = attempts.session_id
      and s.user_id = auth.uid()
    )
  );

create index attempts_session_id_idx on public.attempts (session_id);

-- ─── Metrics ───────────────────────────────────────────────────────────────
create table public.metrics (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade not null unique,
  filler_count integer default 0 not null,
  filler_per_minute numeric(6,2) default 0 not null,
  words_per_minute integer default 0 not null,
  total_silence_ms integer default 0 not null,
  longest_pause_ms integer default 0 not null,
  time_to_first_sentence_ms integer default 0 not null,
  recovery_count integer default 0 not null,
  speech_duration_ms integer default 0 not null,
  word_count integer default 0 not null
);

alter table public.metrics enable row level security;

create policy "Users can manage own metrics"
  on public.metrics for all
  using (
    exists (
      select 1 from public.attempts a
      join public.sessions s on s.id = a.session_id
      where a.id = metrics.attempt_id
      and s.user_id = auth.uid()
    )
  );

-- ─── Feedback ──────────────────────────────────────────────────────────────
create table public.feedback (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade not null unique,
  clarity_score smallint not null check (clarity_score between 1 and 10),
  structure_score smallint not null check (structure_score between 1 and 10),
  composure_score smallint not null check (composure_score between 1 and 10),
  freeze_resilience_score smallint not null check (freeze_resilience_score between 1 and 10),
  strength_text text not null,
  priority_fix_text text not null,
  rescue_phrase text not null,
  retry_instruction text not null default '',
  created_at timestamptz default now() not null
);

alter table public.feedback enable row level security;

create policy "Users can manage own feedback"
  on public.feedback for all
  using (
    exists (
      select 1 from public.attempts a
      join public.sessions s on s.id = a.session_id
      where a.id = feedback.attempt_id
      and s.user_id = auth.uid()
    )
  );

-- ─── Storage bucket for recordings ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings',
  'recordings',
  false,
  52428800, -- 50MB
  array['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do nothing;

create policy "Users can upload own recordings"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own recordings"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
