-- OffScript: Hybrid Freeze Modelling v1
-- Adds event-level speech analysis + visual steadiness scaffolding.

-- ─── Speech events ────────────────────────────────────────────────────────
create table if not exists public.speech_events (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade not null,
  event_type text not null check (
    event_type in (
      'false_start',
      'repeated_start',
      'hesitation_cluster',
      'freeze',
      'recovery',
      'bridge_phrase_recovery'
    )
  ),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  severity numeric(4,3) not null default 0.500 check (severity >= 0 and severity <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.speech_events enable row level security;

create policy "Users can manage own speech events"
  on public.speech_events for all
  using (
    exists (
      select 1 from public.attempts a
      join public.sessions s on s.id = a.session_id
      where a.id = speech_events.attempt_id
      and s.user_id = auth.uid()
    )
  );

create index if not exists speech_events_attempt_id_idx on public.speech_events (attempt_id);
create index if not exists speech_events_type_idx on public.speech_events (event_type);
create index if not exists speech_events_start_ms_idx on public.speech_events (start_ms);

-- ─── Freeze episodes ──────────────────────────────────────────────────────
create table if not exists public.freeze_episodes (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade not null,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  recovered boolean not null default true,
  speech_signals jsonb not null default '{}'::jsonb,
  visual_signals jsonb not null default '{}'::jsonb,
  recovery_phrase_used boolean not null default false,
  created_at timestamptz default now() not null
);

alter table public.freeze_episodes enable row level security;

create policy "Users can manage own freeze episodes"
  on public.freeze_episodes for all
  using (
    exists (
      select 1 from public.attempts a
      join public.sessions s on s.id = a.session_id
      where a.id = freeze_episodes.attempt_id
      and s.user_id = auth.uid()
    )
  );

create index if not exists freeze_episodes_attempt_id_idx on public.freeze_episodes (attempt_id);
create index if not exists freeze_episodes_start_ms_idx on public.freeze_episodes (start_ms);

-- ─── Visual metrics ───────────────────────────────────────────────────────
create table if not exists public.visual_metrics (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade not null unique,
  face_visible_ratio numeric(5,4),
  face_centered_ratio numeric(5,4),
  avg_head_yaw numeric(7,3),
  head_yaw_std numeric(7,3),
  avg_head_pitch numeric(7,3),
  looking_away_ms integer,
  visual_steadiness_score smallint check (visual_steadiness_score between 1 and 10),
  created_at timestamptz default now() not null
);

alter table public.visual_metrics enable row level security;

create policy "Users can manage own visual metrics"
  on public.visual_metrics for all
  using (
    exists (
      select 1 from public.attempts a
      join public.sessions s on s.id = a.session_id
      where a.id = visual_metrics.attempt_id
      and s.user_id = auth.uid()
    )
  );

create index if not exists visual_metrics_attempt_id_idx on public.visual_metrics (attempt_id);
