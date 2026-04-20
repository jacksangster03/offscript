import type { TranscriptionResult } from '@/types'

const MOCK_TRANSCRIPT: TranscriptionResult = {
  transcript: `Well, urban beekeeping is something I find genuinely interesting. I think cities can support it, though there are some real tensions to navigate. On one hand, urban bees can help with pollination in parks and gardens, which is often quite limited in dense areas. There's also an educational angle — schools and community centres can use hives to teach about ecosystems. On the other hand, I'd want to be careful about ecological balance. If there are already native bee populations, introducing honeybee colonies at scale could compete for resources. So I'd say cities should support it, but carefully — regulated, capped, and tied to educational programmes rather than just letting it expand unchecked.`,
  words: [],
  duration_sec: 58,
  mock: true,
}

export async function transcribeAudio(
  audioBlob: Blob,
  filename = 'audio.webm'
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey.startsWith('sk-mock')) {
    // Simulate a delay for realism in mock mode
    await new Promise(r => setTimeout(r, 1200))
    return MOCK_TRANSCRIPT
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    const file = new File([audioBlob], filename, { type: audioBlob.type })

    const response = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })

    // verbose_json returns words with start/end timestamps
    const words =
      (response as unknown as { words?: Array<{ word: string; start: number; end: number }> })
        .words?.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })) ?? []

    return {
      transcript: response.text,
      words,
      duration_sec: response.duration ?? audioBlob.size / 16000,
      mock: false,
    }
  } catch (err) {
    console.error('Transcription failed, using mock:', err)
    return { ...MOCK_TRANSCRIPT, mock: true }
  }
}
