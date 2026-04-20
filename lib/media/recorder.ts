// MediaRecorder wrapper for robust browser recording

export type RecorderState = 'idle' | 'requesting' | 'ready' | 'recording' | 'stopped' | 'error'

export interface RecorderOptions {
  onStateChange?: (state: RecorderState) => void
  onAudioLevel?: (level: number) => void
  onError?: (err: Error) => void
}

const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

export class DrillRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private levelInterval: ReturnType<typeof setInterval> | null = null
  private state: RecorderState = 'idle'
  private options: RecorderOptions

  constructor(options: RecorderOptions = {}) {
    this.options = options
  }

  async requestPermissions(): Promise<MediaStream> {
    this.setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
      this.stream = stream
      this.setupAudioAnalyser(stream)
      this.setState('ready')
      return stream
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Permission denied')
      this.options.onError?.(error)
      this.setState('error')
      throw error
    }
  }

  start(): void {
    if (!this.stream || this.state !== 'ready') {
      throw new Error('Recorder not ready')
    }

    this.chunks = []
    const mimeType = this.getSupportedMimeType()

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: 1_000_000,
      audioBitsPerSecond: 128_000,
    })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.onerror = (e) => {
      this.options.onError?.(new Error(`MediaRecorder error: ${e.type}`))
      this.setState('error')
    }

    this.mediaRecorder.start(1000) // collect chunks every second
    this.setState('recording')
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.state !== 'recording') {
        reject(new Error('Not recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType ?? 'video/webm'
        const blob = new Blob(this.chunks, { type: mimeType })
        this.setState('stopped')
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  extractAudioBlob(videoBlob: Blob): Blob {
    // Return the blob as-is — Whisper accepts WebM/MP4 audio tracks directly
    return videoBlob
  }

  destroy(): void {
    this.stopAudioLevel()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.chunks = []
    this.setState('idle')
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  getState(): RecorderState {
    return this.state
  }

  private setState(state: RecorderState): void {
    this.state = state
    this.options.onStateChange?.(state)
  }

  private setupAudioAnalyser(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256

      const source = this.audioContext.createMediaStreamSource(stream)
      source.connect(this.analyser)

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.levelInterval = setInterval(() => {
        if (!this.analyser) return
        this.analyser.getByteFrequencyData(dataArray)
        const sum = dataArray.reduce((a, b) => a + b, 0)
        const level = sum / (dataArray.length * 255)
        this.options.onAudioLevel?.(level)
      }, 50)
    } catch {
      // AudioContext not available — non-fatal
    }
  }

  private stopAudioLevel(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval)
      this.levelInterval = null
    }
  }

  private getSupportedMimeType(): string {
    for (const type of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }
}
