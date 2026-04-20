# OffScript

**Train the ability to speak under uncertainty.**

OffScript is a focused speaking training product that targets the exact skill most apps ignore: what to do when you blank, freeze, or run out of words mid-sentence. It is not a pronunciation coach, a filler-word counter, or a confidence booster. It is a simulator for high-pressure unscripted speech.

---

## Why this exists

Most public speaking apps train you to sound better. They measure pace, pitch, and "um" frequency. That is useful but secondary. The real failure mode for most speakers is not sounding rough — it is stopping. Freezing on an unfamiliar topic. Losing your place and not recovering. Depending on a script that is no longer available.

OffScript trains specifically for that:

| Before | After |
|---|---|
| "I need a perfect script." | "I can handle not knowing what comes next." |
| "I blanked and could not recover." | "I used a bridge phrase and kept going." |
| "I froze on an unfamiliar topic." | "I structured a response in real time." |
| "I rely on memorised wording." | "I completed the answer even when uncertain." |

The design philosophy in one sentence:

> The goal is not to sound perfect. The goal is to keep going when you do not know exactly what to say.

---

## Product overview

### Core session flow

1. User lands on the dashboard and clicks **Start Drill**
2. A random unfamiliar prompt appears with 2–4 short context bullets
3. A **20-second prep countdown** begins — time to read, think, plan an opening line
4. When prep ends, a **60-second speaking session** begins with live webcam and microphone
5. The circular timer counts down; a microphone waveform shows live audio activity
6. If the user appears to be freezing (low audio level after 40 seconds), a rescue cue phrase appears on screen
7. Recording stops automatically at 60 seconds or when the user ends early
8. Audio is uploaded and transcribed via **OpenAI Whisper**
9. Timing metrics are computed deterministically from word timestamps
10. **GPT-4o** generates structured coaching feedback using a strict rubric
11. Results appear: four score rings, timing metrics, strength, priority fix, rescue phrase for next time
12. User can retry the same topic from a new angle, or start a fresh drill

### Drill modes

| Mode | Description |
|---|---|
| **Daily Random** | One random topic across all categories, difficulty matched to your setting |
| **Chaos Mode** | Difficulty 3–4 only: abstract, ambiguous, or pressure-simulation prompts |
| **Retry Mode** | Same topic reframed with a new angle — trains recovery and iteration |

Future modes (architecture ready): Interview, Debate Flip, Presentation Rescue, Continue-after-interruption.

### The Freeze Resilience Score

This is the app's signature metric. It is **not** a generic confidence score. It measures:

- How quickly you started speaking (time to first sentence)
- How long your longest pause was
- Whether you recovered after freezing and continued
- Whether you completed the response with enough substance

It is computed as a blend: a deterministic algorithm runs on Whisper's word-level timestamps, and GPT-4o provides a linguistic impression. The final score averages both.

Score interpretation:

| Score | Meaning |
|---|---|
| 8–10 | Strong resilience — you kept going and recovered well |
| 6–7 | Moderate — you hesitated but did not collapse |
| 4–5 | Some freezing — pauses were long or recovery was slow |
| 1–3 | Significant freeze — you stopped for an extended period or did not start quickly |

---

## Technical architecture

```
offscript/
│
├── app/                          # Next.js 14 App Router
│   ├── (app)/                    # Route group: authenticated pages
│   │   ├── layout.tsx            # Auth gate + persistent nav shell
│   │   ├── dashboard/page.tsx    # Stats, recent sessions, mode picker, CTA
│   │   ├── drill/page.tsx        # Bootstraps session, serves DrillSession
│   │   ├── results/[id]/page.tsx # Results page: scores, transcript, feedback
│   │   ├── progress/page.tsx     # Historical charts via Recharts
│   │   └── settings/page.tsx     # Profile and preference form
│   │
│   ├── api/                      # Server-side API routes
│   │   ├── prompts/route.ts      # GET — fetch a random prompt (filtered by mode/difficulty)
│   │   ├── sessions/route.ts     # POST — create a session record
│   │   ├── attempts/route.ts     # POST — full pipeline: upload → transcribe → compute → coach → save
│   │   └── auth/callback/route.ts # OAuth code exchange for Supabase
│   │
│   ├── sign-in/page.tsx          # Email/password sign in (dynamic — no static prerender)
│   ├── sign-up/page.tsx          # Registration (dynamic)
│   ├── page.tsx                  # Landing page (public)
│   ├── layout.tsx                # Root layout: fonts, metadata, dark mode class
│   └── globals.css               # Tailwind directives + custom utilities
│
├── components/
│   ├── ui/                       # Primitive design-system components
│   │   ├── Button.tsx            # Framer Motion button with variants and loading state
│   │   ├── Card.tsx              # Surface card with elevation variants
│   │   ├── Badge.tsx             # Status badge with semantic colour variants
│   │   ├── ScoreRing.tsx         # Animated SVG circular score with colour coding
│   │   └── cn.ts                 # clsx + tailwind-merge utility
│   │
│   ├── drill/                    # The core session UI
│   │   ├── DrillSession.tsx      # Top-level state machine: idle → prep → speaking → analysing → done
│   │   ├── CircularTimer.tsx     # SVG ring countdown with glow, pulse, and phase-aware colours
│   │   ├── MicWaveform.tsx       # Real-time audio-level bar visualiser
│   │   ├── WebcamPreview.tsx     # Live camera feed with REC indicator
│   │   └── PromptCard.tsx        # Prompt display with context bullets and retry angle
│   │
│   ├── results/
│   │   ├── FeedbackPanel.tsx     # Staggered reveal: score rings, metrics, strength/fix/rescue phrase
│   │   └── TranscriptView.tsx    # Collapsible transcript with mock indicator
│   │
│   └── dashboard/
│       ├── AppNav.tsx            # Fixed top nav with route highlighting and sign-out
│       ├── ProgressCharts.tsx    # Recharts line/bar charts for all tracked metrics
│       └── SettingsForm.tsx      # Client-side profile and preference updater
│
├── hooks/
│   ├── useTimer.ts               # Countdown timer with tick/complete callbacks, progress ratio
│   └── useRecorder.ts            # MediaRecorder wrapper: permissions, start/stop, audio level
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (SSR-safe)
│   │   └── server.ts             # Server Supabase client (cookies via next/headers)
│   ├── ai/
│   │   ├── coaching.ts           # GPT-4o coaching with strict JSON rubric + mock fallback
│   │   └── transcription.ts      # Whisper transcription with word timestamps + mock fallback
│   ├── metrics/
│   │   └── compute.ts            # Deterministic metric computation from word timestamps
│   └── prompts/
│       └── seed-data.ts          # 50+ typed prompt objects (TypeScript source of truth)
│
├── types/index.ts                # All shared TypeScript types and interfaces
├── middleware.ts                 # Supabase session refresh + auth-gate routing
│
└── supabase/
    ├── migrations/001_initial.sql # Full schema: profiles, prompts, sessions, attempts, metrics, feedback
    └── seed.sql                   # 25 ready-to-run seed prompts
```

### Data flow for a completed attempt

```
Browser                    API /attempts             Supabase           OpenAI
  │                            │                        │                  │
  │── FormData (audio blob) ──▶│                        │                  │
  │                            │── Upload to Storage ──▶│                  │
  │                            │── Fetch prompt ────────▶│                  │
  │                            │── transcribeAudio() ──────────────────────▶│
  │                            │◀──── transcript + word timestamps ─────────│
  │                            │── computeMetricsFromWords()                │
  │                            │   (pure function, no network)              │
  │                            │── INSERT attempt ──────▶│                  │
  │                            │── INSERT metrics ──────▶│                  │
  │                            │── generateCoaching() ─────────────────────▶│
  │                            │◀────── structured JSON coaching ───────────│
  │                            │── blendFreezeResilienceScore()             │
  │                            │── INSERT feedback ─────▶│                  │
  │                            │── UPDATE session ──────▶│                  │
  │                            │── updateStreak() ──────▶│                  │
  │◀── { attemptId } ──────────│                        │                  │
  │
  │── router.push(/results/[id])
```

### Why metrics are computed in code, not by AI

The LLM cannot reliably produce consistent numbers for things like "longest pause was 4.2 seconds". It hallucinates, rounds, or varies. All deterministic metrics — pause durations, WPM, filler frequency, time to first sentence, recovery count — are computed from Whisper's word-level timestamps in `lib/metrics/compute.ts`. The LLM only interprets these results and adds qualitative assessment. This separation makes the metrics auditable, consistent, and cheap to recompute.

### Mock mode

Every external API call has a realistic fallback. If `OPENAI_API_KEY` is unset or starts with `sk-mock`, the app:

- Returns a pre-written plausible transcript
- Returns a fixed coaching object with real-looking feedback
- Computes metrics from the mock transcript using the same code path
- Shows a small "demo mode" badge on the results page

You can demo the entire product flow — prep timer, webcam, recording, analysis, results — without any paid API access.

---

## Database schema

All tables have Row Level Security enabled. Users can only read and write their own data.

### `profiles`

Auto-created by a Postgres trigger on `auth.users` insert.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK, FK → auth.users) | Supabase auth user ID |
| `email` | text | User email |
| `display_name` | text | Shown in nav and greeting |
| `preferred_mode` | text | `daily`, `chaos`, `retry`, etc. |
| `preferred_difficulty` | smallint 1–4 | Default prompt difficulty |
| `streak_count` | integer | Current consecutive daily streak |
| `last_session_date` | date | Used for streak calculation |

### `prompts`

Curated prompt bank. Read-only to authenticated users via RLS.

| Column | Type | Description |
|---|---|---|
| `topic` | text | Short topic name (e.g. "Urban Beekeeping") |
| `category` | text | One of 10 categories (society, science, business, ethics, history, technology, culture, absurd, interview, debate) |
| `difficulty` | smallint 1–4 | 1=familiar, 2=unfamiliar, 3=abstract, 4=pressure |
| `stance_type` | text | `open`, `defend`, `explain`, `argue`, `imagine` |
| `prompt_text` | text | The question presented to the speaker |
| `context_bullets` | jsonb | Array of 2–4 short context strings |
| `retry_angle` | text | Alternative framing for retry attempts |
| `tags` | jsonb | String array for filtering |
| `active` | boolean | Soft-disable without deletion |

### `sessions`

One per drill attempt, tracks mode and lifecycle.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid FK → profiles | Owner |
| `prompt_id` | uuid FK → prompts | Which prompt was shown |
| `mode` | text | Drill mode used |
| `difficulty` | smallint | Difficulty at time of session |
| `status` | text | `active`, `completed`, `abandoned` |
| `started_at` / `completed_at` | timestamptz | Session lifecycle timestamps |

### `attempts`

One per recording. Multiple attempts per session are supported (retry flow).

| Column | Type | Description |
|---|---|---|
| `session_id` | uuid FK → sessions | Parent session |
| `attempt_number` | smallint | 1 = first, 2 = retry, etc. |
| `audio_url` | text | Supabase Storage public URL |
| `transcript` | text | Full transcript text |
| `duration_sec` | integer | Recording duration |

### `metrics`

One-to-one with attempts. All values computed in code.

| Column | Type | Description |
|---|---|---|
| `filler_count` | integer | Total filler words detected |
| `filler_per_minute` | numeric | Rate of fillers |
| `words_per_minute` | integer | Active speech WPM (net of silence) |
| `total_silence_ms` | integer | Total pause time in milliseconds |
| `longest_pause_ms` | integer | Single longest pause in milliseconds |
| `time_to_first_sentence_ms` | integer | Latency before first word |
| `recovery_count` | integer | Number of pauses longer than 2s followed by resumed speech |
| `word_count` | integer | Total words spoken |

### `feedback`

One-to-one with attempts. AI-generated, structured.

| Column | Type | Description |
|---|---|---|
| `clarity_score` | smallint 1–10 | Directness and relevance |
| `structure_score` | smallint 1–10 | Logical flow and organisation |
| `composure_score` | smallint 1–10 | Controlled delivery despite uncertainty |
| `freeze_resilience_score` | smallint 1–10 | Signature metric — blended computation |
| `strength_text` | text | One specific, referenced strength |
| `priority_fix_text` | text | One actionable fix referencing actual moments |
| `rescue_phrase` | text | A short usable bridge phrase for next time |
| `retry_instruction` | text | One directive sentence for the retry |

---

## Prompt bank

OffScript ships with 50+ hand-written prompts across 10 categories and 4 difficulty levels. All prompts are designed to be:

- **Interpretable without expertise** — you do not need to know about the topic to attempt an answer
- **Unfamiliar enough to challenge** — you cannot rehearse these in advance
- **Varied in framing** — open questions, positions to defend, things to explain, arguments to make
- **Equipped with a retry angle** — a different framing that makes the same topic approachable from a new direction

Categories: Society, Science, Business, Ethics, History, Technology, Culture, Open/Absurd, Interview, Debate.

Difficulty scale:
- **Level 1**: Common topics you could have an opinion on (four-day work week, phone bans in schools)
- **Level 2**: Less familiar, requires more real-time reasoning (geoengineering, antibiotic resistance)
- **Level 3**: Abstract or contested (AI moral status, meritocracy, what is nothingness)
- **Level 4**: Pure pressure simulation (make the case that being wrong is good, convince me a boring thing is fascinating)

---

## AI coaching design

The coaching pipeline sends the transcript, all computed metrics, and the original prompt to GPT-4o with a strict system prompt. The model returns structured JSON only — no prose wrappers.

### What the model evaluates

- **Directness of opening** — did the speaker take a position in the first sentence or hedge endlessly?
- **Relevance** — did the response actually address the prompt?
- **Logical flow** — was there any structure, even informal?
- **Recovery after pauses** — did the speaker bridge out of freezes or just stop?
- **Filler dependency** — are fillers compensating for real content or just part of natural speech?
- **Completion** — did the speaker get to a landing, or trail off?

### Feedback philosophy

The model is explicitly instructed against generic feedback:

| Bad (rejected by prompt) | Good (what is required) |
|---|---|
| "You seemed nervous." | "You waited 8 seconds before making a clear point." |
| "Try to be more confident." | "Your strongest structure appeared when you said 'there are two sides to this'." |
| "Great job!" | "You recovered after a 4-second pause by using a framing phrase." |

### The rescue phrase feature

Every session ends with one short phrase the user can use immediately next time they freeze. These are concrete and conversational:

- *"Let me approach this from another angle."*
- *"The key tension here is…"*
- *"I don't know much about this, but based on the context…"*
- *"One way to think about it is…"*
- *"What matters most is…"*

This is not motivational fluff. It is a trained verbal move — a recoverable bridge that buys time and maintains forward momentum.

---

## Stack decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Server components reduce client bundle; API routes colocate backend logic |
| Language | TypeScript strict | Full type safety across client, server, and database shapes |
| Styling | Tailwind CSS | Utility-first, consistent spacing, dark mode via class |
| Animation | Framer Motion | Declarative spring/tween animations, AnimatePresence for route transitions |
| Database + Auth | Supabase | Postgres with RLS, instant auth, storage, and realtime if needed later |
| Transcription | OpenAI Whisper | Word-level timestamps are essential for accurate pause detection |
| Coaching | OpenAI GPT-4o | Best structured JSON output quality with `response_format: json_object` |
| Charts | Recharts | Composable, React-native, works without a separate charting library |
| Recording | MediaRecorder API | Native browser API, no dependencies, supports WebM/MP4 |

---

## Local setup

### Prerequisites

- Node.js 18+
- A Supabase account (free tier is fine)
- An OpenAI API key (optional — mock mode works without it)

### Step 1: Clone and install

```bash
git clone https://github.com/jacksangster03/offscript.git
cd offscript
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```env
# From https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Service role key — used server-side only, never exposed to browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI — optional. If unset, the app runs in mock mode automatically.
OPENAI_API_KEY=sk-proj-...

# Your local or production URL (used for auth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> If you skip `OPENAI_API_KEY`, the app still works fully. All transcription and coaching falls back to realistic mock data. A small "demo mode" badge appears on the results page.

### Step 3: Set up Supabase

**3a. Create a project** at [supabase.com](https://supabase.com). The free tier is sufficient.

**3b. Run the migration.** In your project's SQL editor, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates all tables, RLS policies, indexes, the auto-profile trigger, and the storage bucket.

**3c. Seed the prompt bank.** Paste and run:

```
supabase/seed.sql
```

This inserts 25 ready-to-use prompts. You can add more from `lib/prompts/seed-data.ts` at any time.

**3d. Enable Email Auth.** In Supabase dashboard: Authentication → Providers → Email. It is enabled by default.

### Step 4: Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

Create an account, run your first drill, and see your Freeze Resilience Score.

---

## Deployment (Vercel)

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_APP_URL  # set to your production domain
```

Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL (`https://your-app.vercel.app`) in the Supabase auth settings under URL Configuration.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run type-check` | Run TypeScript compiler without emitting |
| `npm run lint` | ESLint |

---

## What is mocked vs live

| Feature | No API key | With API key |
|---|---|---|
| Transcription | Pre-written realistic transcript | OpenAI Whisper with word-level timestamps |
| Coaching | Fixed plausible feedback object | GPT-4o structured JSON via rubric |
| Metrics | Estimated heuristically from mock transcript | Computed from real Whisper word timestamps |
| Auth | Real Supabase | Real Supabase |
| Database | Real Supabase Postgres | Real Supabase Postgres |
| Storage | Attempted, non-blocking on failure | Supabase Storage (WebM files) |
| Recording | Real browser MediaRecorder | Real browser MediaRecorder |
| Timer + webcam | Real | Real |

---

## Extending the prompt bank

Add prompts to `lib/prompts/seed-data.ts` using the `PromptSeed` type. Then generate the SQL insert and run it:

```typescript
// Each entry follows this shape:
{
  topic: 'Your Topic',
  category: 'society', // one of 10 categories
  difficulty: 2,       // 1–4
  stance_type: 'argue',
  prompt_text: 'Your question here?',
  context_bullets: [
    'First context point',
    'Second context point',
    'Third context point',
  ],
  retry_angle: 'A different angle to try on the same topic.',
  tags: ['tag1', 'tag2'],
}
```

Or insert directly via the Supabase SQL editor or table editor.

---

## Known tradeoffs and limitations

**Audio upload size.** A 60-second WebM recording is typically 1–4 MB. Whisper accepts up to 25 MB. No issue in practice, but large recordings on slow connections can slow the analysis phase.

**No real-time transcript.** Live transcription during speaking is excluded from V1 to avoid distraction and complexity. The brief shows it as optional.

**Pause detection accuracy.** Without Whisper's word timestamps (i.e., in mock mode), pause durations are estimated heuristically from WPM. With timestamps, they are accurate to ~100ms.

**HTTPS required for camera/mic.** Browsers block `getUserMedia` on non-localhost HTTP. In production, use HTTPS (Vercel handles this automatically).

**Single-attempt model.** The current results page shows one attempt at a time. The database schema supports multiple attempts per session, ready for a side-by-side comparison view.

---

## Roadmap

| Feature | Status |
|---|---|
| Interview Mode | Architecture ready, prompts seeded |
| Debate Flip Mode | Architecture ready |
| Presentation Rescue (mid-sentence interruption) | Planned |
| Side-by-side retry comparison | Planned |
| Coach dashboard (classroom/team mode) | Planned |
| Audio-only mode (no video) | Easy add — strip video track before Whisper |
| Daily reminder notifications | Planned |
| Face framing cues (basic webcam centering) | Planned |
| 500+ prompt bank | Easy — add to seed-data.ts |

---

## Contributing

Prompts are the easiest high-value contribution. If you write a prompt that meets the quality bar (interpretable without expertise, unfamiliar enough to challenge, equipped with a retry angle), open a PR against `lib/prompts/seed-data.ts`.

For code contributions: open an issue first to discuss, then PR against `main`.

---

## Licence

MIT
