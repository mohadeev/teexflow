/// <reference lib="webworker" />
// Runs Whisper (via Transformers.js) off the main thread so the prompter keeps
// scrolling smoothly while speech is being recognized.
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

export type WorkerRequest =
  | { type: 'load'; model: string; language: string | null }
  | { type: 'transcribe'; id: number; audio: Float32Array }

export type WorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'text'; id: number; text: string }
  | { type: 'error'; error: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope
env.allowLocalModels = false

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null
let language: string | null = null

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    if (msg.type === 'load') {
      language = msg.language
      // Model files are downloaded once and kept in the browser's cache.
      const loaded = new Map<string, { loaded: number; total: number }>()
      asr = pipeline('automatic-speech-recognition', msg.model, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status !== 'progress' || !p.file || !p.total) return
          loaded.set(p.file, { loaded: p.loaded ?? 0, total: p.total })
          const all = [...loaded.values()]
          const progress = all.reduce((a, f) => a + f.loaded, 0) / all.reduce((a, f) => a + f.total, 0)
          ctx.postMessage({ type: 'progress', progress } satisfies WorkerResponse)
        },
      }) as Promise<AutomaticSpeechRecognitionPipeline>
      await asr
      ctx.postMessage({ type: 'ready' } satisfies WorkerResponse)
    } else if (msg.type === 'transcribe' && asr) {
      const run = await asr
      const out = await run(msg.audio, language ? { language, task: 'transcribe' } : {})
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text
      ctx.postMessage({ type: 'text', id: msg.id, text } satisfies WorkerResponse)
    }
  } catch (err) {
    ctx.postMessage({ type: 'error', error: (err as Error).message ?? String(err) } satisfies WorkerResponse)
  }
}
