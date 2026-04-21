// ─── Enums ─────────────────────────────────────────────────────────────────

export type DrillMode = 'daily' | 'chaos' | 'retry' | 'interview' | 'debate' | 'rescue'
export type Difficulty = 1 | 2 | 3 | 4
export type SessionStatus = 'pending' | 'active' | 'completed' | 'abandoned'
export type PromptCategory =
  | 'society'
  | 'science'
  | 'business'
  | 'ethics'
  | 'history'
  | 'technology'
  | 'culture'
  | 'absurd'
  | 'interview'
  | 'debate'

// ─── Database shapes ────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  preferred_mode: DrillMode
  preferred_difficulty: Difficulty
  streak_count: number
  last_session_date: string | null
  onboarding_completed: boolean
}

export interface Prompt {
  id: string
  topic: string
  category: PromptCategory
  difficulty: Difficulty
  stance_type: 'open' | 'defend' | 'explain' | 'argue' | 'imagine'
  prompt_text: string
  context_bullets: string[]
  retry_angle: string
  tags: string[]
  active: boolean
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  prompt_id: string
  mode: DrillMode
  difficulty: Difficulty
  started_at: string
  completed_at: string | null
  status: SessionStatus
  prompt?: Prompt
}

export interface Attempt {
  id: string
  session_id: string
  attempt_number: number
  video_url: string | null
  audio_url: string | null
  transcript: string | null
  duration_sec: number | null
  created_at: string
  metrics?: Metrics
  feedback?: Feedback
}

export interface Metrics {
  id: string
  attempt_id: string
  filler_count: number
  filler_per_minute: number
  words_per_minute: number
  total_silence_ms: number
  longest_pause_ms: number
  time_to_first_sentence_ms: number
  recovery_count: number
  speech_duration_ms: number
  word_count: number
}

export interface Feedback {
  id: string
  attempt_id: string
  clarity_score: number        // 1–10
  structure_score: number      // 1–10
  composure_score: number      // 1–10
  freeze_resilience_score: number // 1–10 — the signature metric
  strength_text: string
  priority_fix_text: string
  rescue_phrase: string
  retry_instruction: string
  created_at: string
}

// ─── UI / session state ─────────────────────────────────────────────────────

export type DrillPhase =
  | 'idle'
  | 'loading'
  | 'prep'
  | 'speaking'
  | 'uploading'
  | 'analysing'
  | 'done'
  | 'error'

export interface SessionState {
  phase: DrillPhase
  session: Session | null
  attempt: Attempt | null
  prompt: Prompt | null
  prepSecondsLeft: number
  speakingSecondsLeft: number
  recordingBlob: Blob | null
  error: string | null
}

// ─── API response shapes ─────────────────────────────────────────────────────

export interface TranscriptionResult {
  transcript: string
  words?: TranscriptWord[]
  duration_sec: number
  mock?: boolean
}

export interface TranscriptWord {
  word: string
  start: number // seconds
  end: number
  confidence?: number
}

export interface CoachingResult {
  clarity_score: number
  structure_score: number
  composure_score: number
  freeze_resilience_score: number
  strength_text: string
  priority_fix_text: string
  rescue_phrase: string
  retry_instruction: string
  mock?: boolean
}

export interface ComputedMetrics {
  filler_count: number
  filler_per_minute: number
  words_per_minute: number
  total_silence_ms: number
  longest_pause_ms: number
  time_to_first_sentence_ms: number
  recovery_count: number
  speech_duration_ms: number
  word_count: number
}

export type SpeechEventType =
  | 'false_start'
  | 'repeated_start'
  | 'hesitation_cluster'
  | 'freeze'
  | 'recovery'
  | 'bridge_phrase_recovery'

export interface SpeechEvent {
  event_type: SpeechEventType
  start_ms: number
  end_ms: number
  severity: number // 0-1
  metadata?: Record<string, unknown>
}

export interface FreezeEpisode {
  start_ms: number
  end_ms: number
  recovered: boolean
  speech_signals: Record<string, unknown>
  visual_signals: Record<string, unknown>
  recovery_phrase_used: boolean
}

export interface VisualEvent {
  event_type: 'looking_away' | 'head_drop' | 'out_of_frame' | 'excessive_jitter'
  start_ms: number
  end_ms: number
  severity: number // 0-1
  metadata?: Record<string, unknown>
}

export interface VisualMetricsSummary {
  face_visible_ratio: number
  face_centered_ratio: number
  avg_head_yaw: number
  head_yaw_std: number
  avg_head_pitch: number
  looking_away_ms: number
  visual_steadiness_score: number
}

export interface AttemptFeatureVector {
  start_latency_ms: number
  pause_count_500ms: number
  pause_count_2000ms: number
  longest_pause_ms: number
  total_silence_ms: number
  word_count: number
  filler_count: number
  filler_clusters: number
  repeated_token_count: number
  repeated_bigram_count: number
  restart_count: number
  bridge_phrase_count: number
  speech_burst_mean_ms: number
  speech_burst_std_ms: number
  trailing_off_flag: boolean
}

export interface CompositeFreezeScores {
  freeze_severity_index: number // 1-10
  restart_efficiency_score: number // 1-10
  visual_steadiness_score: number // 1-10
  recovery_quality_score: number // 1-10
  freeze_resilience_score: number // 1-10
}

export interface HybridAnalysisResult {
  speech_events: SpeechEvent[]
  freeze_episodes: FreezeEpisode[]
  feature_vector: AttemptFeatureVector
}

// ─── Progress / analytics ────────────────────────────────────────────────────

export interface ProgressDataPoint {
  date: string
  freeze_resilience_score: number
  clarity_score: number
  structure_score: number
  composure_score: number
  words_per_minute: number
  time_to_first_sentence_ms: number
  longest_pause_ms: number
  filler_per_minute: number
  attempt_id: string
}

export interface DashboardStats {
  streak_count: number
  sessions_this_week: number
  avg_freeze_resilience: number
  avg_time_to_first_sentence_ms: number
  avg_longest_pause_ms: number
  improvement_pct: number | null
  recent_strength: string | null
  recent_fix: string | null
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingAnswers {
  struggle: 'starting' | 'continuing' | 'recovery' | 'clarity'
  frequency: 'daily' | '3x_week' | 'weekly'
  difficulty: Difficulty
}
