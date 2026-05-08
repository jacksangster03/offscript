-- OffScript Curiosity Engine v1 (Phase A foundation)
-- Adds taxonomy/topics/topic prompts + user curiosity tracking and challenge scaffolding.

create table if not exists public.topic_categories (
  id uuid default uuid_generate_v4() primary key,
  slug text not null unique,
  name text not null,
  description text,
  parent_id uuid references public.topic_categories(id) on delete set null,
  depth smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text not null unique,
  summary text,
  source_label text,
  source_url text,
  wikidata_id text,
  difficulty smallint check (difficulty between 1 and 4),
  quality_score numeric(5,2),
  speakability_score numeric(5,2),
  weirdness_score numeric(5,2),
  conversation_value_score numeric(5,2),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.topic_category_links (
  topic_id uuid not null references public.topics(id) on delete cascade,
  category_id uuid not null references public.topic_categories(id) on delete cascade,
  confidence numeric(4,3) not null default 0.8 check (confidence between 0 and 1),
  primary key (topic_id, category_id)
);

create table if not exists public.topic_prompts (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid not null references public.topics(id) on delete cascade,
  category_id uuid references public.topic_categories(id) on delete set null,
  prompt_variant text not null check (
    prompt_variant in (
      'explain','make_interesting','connect_to_modern_life','argue_importance',
      'debate_both_sides','analogy','story','hot_take'
    )
  ),
  prompt_text text not null,
  context_bullets jsonb not null default '[]'::jsonb,
  speaking_angle text,
  retry_angle text,
  difficulty smallint check (difficulty between 1 and 4),
  source_label text,
  source_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.curiosity_feedback (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  topic_prompt_id uuid references public.topic_prompts(id) on delete set null,
  interestingness_score smallint check (interestingness_score between 1 and 10),
  explanation_score smallint check (explanation_score between 1 and 10),
  connection_score smallint check (connection_score between 1 and 10),
  analogy_score smallint check (analogy_score between 1 and 10),
  opinion_score smallint check (opinion_score between 1 and 10),
  example_score smallint check (example_score between 1 and 10),
  curiosity_score smallint check (curiosity_score between 1 and 10),
  one_interesting_thing text,
  missed_opportunity text,
  stronger_reframe text,
  suggested_related_topic text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_category_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.topic_categories(id) on delete cascade,
  attempts_count integer not null default 0,
  avg_freeze_resilience numeric(5,2),
  avg_interestingness numeric(5,2),
  avg_curiosity numeric(5,2),
  avg_difficulty numeric(5,2),
  last_attempt_at timestamptz,
  avoided_streak integer not null default 0,
  unique (user_id, category_id)
);

create table if not exists public.topic_edges (
  id uuid default uuid_generate_v4() primary key,
  from_topic_id uuid not null references public.topics(id) on delete cascade,
  to_topic_id uuid not null references public.topics(id) on delete cascade,
  edge_type text not null check (edge_type in ('similar','contrast','weird_link','cross_domain')),
  weight numeric(4,3) not null default 0.5 check (weight between 0 and 1),
  reason text,
  unique (from_topic_id, to_topic_id, edge_type)
);

create table if not exists public.challenges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_key text not null,
  title text not null,
  total_days integer not null,
  status text not null default 'active' check (status in ('active','completed','paused','abandoned')),
  starts_at date not null,
  ends_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_days (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_number integer not null,
  due_date date not null,
  topic_prompt_id uuid references public.topic_prompts(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  attempt_id uuid references public.attempts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','completed','missed')),
  unique (challenge_id, day_number)
);

-- Optional visual segmentation table for future phase (G).
create table if not exists public.visual_events (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'face_lost','off_center','looking_away','large_head_movement',
      'low_visual_energy','gesture_burst','hands_not_visible','camera_framing_issue'
    )
  ),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  severity numeric(4,3) not null default 0.5 check (severity between 0 and 1),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.attempts
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists topic_prompt_id uuid references public.topic_prompts(id) on delete set null,
  add column if not exists source_mode text;

create index if not exists topic_categories_parent_idx on public.topic_categories(parent_id);
create index if not exists topic_categories_active_idx on public.topic_categories(active);
create index if not exists topics_active_idx on public.topics(active);
create index if not exists topic_category_links_category_idx on public.topic_category_links(category_id);
create index if not exists topic_prompts_topic_idx on public.topic_prompts(topic_id);
create index if not exists topic_prompts_category_idx on public.topic_prompts(category_id);
create index if not exists topic_prompts_active_idx on public.topic_prompts(active);
create index if not exists user_category_stats_user_idx on public.user_category_stats(user_id);
create index if not exists topic_edges_from_idx on public.topic_edges(from_topic_id);
create index if not exists challenge_days_challenge_idx on public.challenge_days(challenge_id);
create index if not exists visual_events_attempt_idx on public.visual_events(attempt_id);

alter table public.topic_categories enable row level security;
alter table public.topics enable row level security;
alter table public.topic_category_links enable row level security;
alter table public.topic_prompts enable row level security;
alter table public.curiosity_feedback enable row level security;
alter table public.user_category_stats enable row level security;
alter table public.topic_edges enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_days enable row level security;
alter table public.visual_events enable row level security;

create policy "read active categories" on public.topic_categories for select using (active = true);
create policy "read active topics" on public.topics for select using (active = true);
create policy "read topic category links" on public.topic_category_links for select using (true);
create policy "read active topic prompts" on public.topic_prompts for select using (active = true);
create policy "read topic edges" on public.topic_edges for select using (true);

create policy "user curiosity feedback own" on public.curiosity_feedback for all using (
  exists (
    select 1 from public.attempts a
    join public.sessions s on s.id = a.session_id
    where a.id = curiosity_feedback.attempt_id and s.user_id = auth.uid()
  )
);

create policy "user category stats own" on public.user_category_stats for all using (user_id = auth.uid());
create policy "user challenges own" on public.challenges for all using (user_id = auth.uid());
create policy "user challenge days own" on public.challenge_days for all using (
  exists (
    select 1 from public.challenges c
    where c.id = challenge_days.challenge_id and c.user_id = auth.uid()
  )
);

create policy "user visual events own" on public.visual_events for all using (
  exists (
    select 1 from public.attempts a
    join public.sessions s on s.id = a.session_id
    where a.id = visual_events.attempt_id and s.user_id = auth.uid()
  )
);

insert into public.topic_categories (slug, name, description, depth, active)
values
  ('science', 'Science', 'Science prompts and conversation drills', 0, true),
  ('technology', 'Technology', 'Technology prompts and conversation drills', 0, true),
  ('business-and-economics', 'Business & Economics', 'Business & Economics prompts and conversation drills', 0, true),
  ('history', 'History', 'History prompts and conversation drills', 0, true),
  ('geography-and-places', 'Geography & Places', 'Geography & Places prompts and conversation drills', 0, true),
  ('politics-and-power', 'Politics & Power', 'Politics & Power prompts and conversation drills', 0, true),
  ('philosophy-and-ideas', 'Philosophy & Ideas', 'Philosophy & Ideas prompts and conversation drills', 0, true),
  ('psychology-and-human-behaviour', 'Psychology & Human Behaviour', 'Psychology & Human Behaviour prompts and conversation drills', 0, true),
  ('communication-and-language', 'Communication & Language', 'Communication & Language prompts and conversation drills', 0, true),
  ('culture-and-society', 'Culture & Society', 'Culture & Society prompts and conversation drills', 0, true),
  ('art-design-and-aesthetics', 'Art, Design & Aesthetics', 'Art, Design & Aesthetics prompts and conversation drills', 0, true),
  ('literature-film-and-media', 'Literature, Film & Media', 'Literature, Film & Media prompts and conversation drills', 0, true),
  ('music-and-sound', 'Music & Sound', 'Music & Sound prompts and conversation drills', 0, true),
  ('health-medicine-and-human-performance', 'Health, Medicine & Human Performance', 'Health, Medicine & Human Performance prompts and conversation drills', 0, true),
  ('sport-games-and-competition', 'Sport, Games & Competition', 'Sport, Games & Competition prompts and conversation drills', 0, true),
  ('food-agriculture-and-environment', 'Food, Agriculture & Environment', 'Food, Agriculture & Environment prompts and conversation drills', 0, true),
  ('nature-animals-and-the-living-world', 'Nature, Animals & the Living World', 'Nature, Animals & the Living World prompts and conversation drills', 0, true),
  ('religion-mythology-and-belief', 'Religion, Mythology & Belief', 'Religion, Mythology & Belief prompts and conversation drills', 0, true),
  ('law-crime-and-justice', 'Law, Crime & Justice', 'Law, Crime & Justice prompts and conversation drills', 0, true),
  ('war-strategy-and-security', 'War, Strategy & Security', 'War, Strategy & Security prompts and conversation drills', 0, true),
  ('space-and-the-cosmos', 'Space & the Cosmos', 'Space & the Cosmos prompts and conversation drills', 0, true),
  ('the-future', 'The Future', 'The Future prompts and conversation drills', 0, true),
  ('personal-development-and-life-skills', 'Personal Development & Life Skills', 'Personal Development & Life Skills prompts and conversation drills', 0, true),
  ('education-and-learning', 'Education & Learning', 'Education & Learning prompts and conversation drills', 0, true),
  ('travel-and-adventure', 'Travel & Adventure', 'Travel & Adventure prompts and conversation drills', 0, true),
  ('engineering-infrastructure-and-built-world', 'Engineering, Infrastructure & Built World', 'Engineering, Infrastructure & Built World prompts and conversation drills', 0, true),
  ('energy-climate-and-resources', 'Energy, Climate & Resources', 'Energy, Climate & Resources prompts and conversation drills', 0, true),
  ('fashion-status-and-lifestyle', 'Fashion, Status & Lifestyle', 'Fashion, Status & Lifestyle prompts and conversation drills', 0, true),
  ('internet-memes-and-digital-culture', 'Internet, Memes & Digital Culture', 'Internet, Memes & Digital Culture prompts and conversation drills', 0, true),
  ('weird-obscure-and-random', 'Weird, Obscure & Random', 'Weird, Obscure & Random prompts and conversation drills', 0, true),
  ('concepts-and-mental-models', 'Concepts & Mental Models', 'Concepts & Mental Models prompts and conversation drills', 0, true),
  ('people-and-biography', 'People & Biography', 'People & Biography prompts and conversation drills', 0, true),
  ('objects-inventions-and-everyday-things', 'Objects, Inventions & Everyday Things', 'Objects, Inventions & Everyday Things prompts and conversation drills', 0, true),
  ('emotions-relationships-and-social-life', 'Emotions, Relationships & Social Life', 'Emotions, Relationships & Social Life prompts and conversation drills', 0, true),
  ('ethics-dilemmas-and-controversies', 'Ethics, Dilemmas & Controversies', 'Ethics, Dilemmas & Controversies prompts and conversation drills', 0, true),
  ('explanations-of-modern-life', 'Explanations of Modern Life', 'Explanations of Modern Life prompts and conversation drills', 0, true),
  ('debate-motions', 'Debate Motions', 'Debate Motions prompts and conversation drills', 0, true),
  ('make-boring-things-interesting', 'Make Boring Things Interesting', 'Make Boring Things Interesting prompts and conversation drills', 0, true),
  ('cross-domain-connections', 'Cross-Domain Connections', 'Cross-Domain Connections prompts and conversation drills', 0, true),
  ('personal-opinion-prompts', 'Personal Opinion Prompts', 'Personal Opinion Prompts prompts and conversation drills', 0, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    active = excluded.active;
