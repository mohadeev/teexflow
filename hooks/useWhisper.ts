'use client'

import { useEffect, useState } from 'react'
import type { WorkerRequest, WorkerResponse } from '@/lib/whisper.worker'

// Speech recognition with OpenAI's open-source Whisper model, run on the
// device by Transformers.js: free, and no audio leaves the device. The model
// (~40 MB) downloads from Hugging Face once and stays in the browser's cache.
//
// Whisper transcribes clips rather than a live stream, so this re-reads the
// last few seconds about once a second. Voice follow only needs the latest
// words, so each result simply replaces the previous one.

const SAMPLE_RATE = 16000
// How much recent audio each pass reads, and how much new audio starts a pass.
const WINDOW_S = 5
const MIN_NEW_S = 0.6
// Below this loudness the window counts as silence and is skipped: Whisper
// tends to invent text ("Thank you.") for silent audio.
const SILENCE_RMS = 0.008

const WHISPER_LANGUAGES: Record<string, string> = {
  es: 'spanish',
  fr: 'french',
  de: 'german',
  it: 'italian',
  pt: 'portuguese',
}

function modelFor(language: string) {
  const base = language.slice(0, 2).toLowerCase()
  return base === 'en' || !WHISPER_LANGUAGES[base]
    ? { model: 'onnx-community/whisper-tiny.en', language: null }
    : { model: 'onnx-community/whisper-tiny', language: WHISPER_LANGUAGES[base] }
}

// Phrases Whisper produces for noise or silence rather than speech.
function clean(text: string) {
  return text
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type WhisperStatus = 'idle' | 'loading' | 'listening' | 'needs-tap' | 'mic-blocked' | 'unsupported' | 'error'

// One worker (and loaded model) for the page, reused across on/off toggles.
let worker: Worker | null = null
let loadedModel = ''
// The model the worker is loading or has loaded, so it's only requested once.
let requestedModel = ''
const listeners = new Set<(msg: WorkerResponse) => void>()
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../lib/whisper.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => listeners.forEach((l) => l(e.data))
  }
  return worker
}
const post = (msg: WorkerRequest, transfer: Transferable[] = []) => getWorker().postMessage(msg, transfer)

// Averages samples down to 16 kHz (input rates are 44.1 or 48 kHz).
function downsample(input: Float32Array, rate: number) {
  if (rate === SAMPLE_RATE) return new Float32Array(input)
  const ratio = rate / SAMPLE_RATE
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const from = Math.floor(i * ratio)
    const to = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = from; j < to; j++) sum += input[j]
    out[i] = sum / Math.max(1, to - from)
  }
  return out
}

export function useWhisper({ active, language }: { active: boolean; language: string }) {
  const [status, setStatus] = useState<WhisperStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [transcript, setTranscript] = useState('')
  const { model, language: whisperLanguage } = modelFor(language)

  useEffect(() => {
    if (!active) return
    let stopped = false
    let teardown = () => {}

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') {
        return setStatus('unsupported')
      }
      setStatus('loading')

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
          video: false,
        })
      } catch {
        return setStatus('mic-blocked')
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop())

      // Recent audio at 16 kHz, newest at the end.
      const ring = new Float32Array(SAMPLE_RATE * WINDOW_S)
      let filled = 0
      let sinceLastPass = 0
      let ready = loadedModel === model
      let busy = false
      let nextId = 0

      const pass = () => {
        if (!ready || busy || sinceLastPass < SAMPLE_RATE * MIN_NEW_S || filled < SAMPLE_RATE) return
        const audio = ring.slice(ring.length - Math.min(filled, ring.length))
        sinceLastPass = 0
        let energy = 0
        for (const v of audio) energy += v * v
        if (Math.sqrt(energy / audio.length) < SILENCE_RMS) return
        busy = true
        post({ type: 'transcribe', id: ++nextId, audio }, [audio.buffer])
      }

      const onMessage = (msg: WorkerResponse) => {
        if (stopped) return
        if (msg.type === 'progress') setProgress(msg.progress)
        else if (msg.type === 'ready') {
          loadedModel = model
          ready = true
          setStatus(audioCtx.state === 'running' ? 'listening' : 'needs-tap')
        } else if (msg.type === 'text') {
          busy = false
          const text = clean(msg.text)
          if (text) setTranscript(text)
          pass()
        } else if (msg.type === 'error') {
          busy = false
          console.error('Whisper error:', msg.error)
          if (!ready) {
            requestedModel = ''
            setStatus('error')
          }
        }
      }
      listeners.add(onMessage)
      if (!ready && requestedModel !== model) {
        requestedModel = model
        post({ type: 'load', model, language: whisperLanguage })
      }

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      // ScriptProcessor is old but supported everywhere; it only fires while
      // connected to an output, and writes nothing to it.
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        const chunk = downsample(e.inputBuffer.getChannelData(0), audioCtx.sampleRate)
        ring.copyWithin(0, chunk.length)
        ring.set(chunk, ring.length - chunk.length)
        filled = Math.min(ring.length, filled + chunk.length)
        sinceLastPass += chunk.length
        pass()
      }
      source.connect(processor)
      processor.connect(audioCtx.destination)
      stream.getAudioTracks()[0]?.addEventListener('ended', () => setStatus('mic-blocked'))

      // Voice is switched on from the controller, so this page may not have
      // been touched yet, and browsers can keep its audio paused until it is.
      const resume = () => audioCtx.resume().catch(() => {})
      window.addEventListener('pointerdown', resume)
      window.addEventListener('keydown', resume)
      audioCtx.onstatechange = () => {
        if (ready) setStatus(audioCtx.state === 'running' ? 'listening' : 'needs-tap')
      }

      teardown = () => {
        listeners.delete(onMessage)
        window.removeEventListener('pointerdown', resume)
        window.removeEventListener('keydown', resume)
        audioCtx.onstatechange = null
        processor.disconnect()
        source.disconnect()
        stream.getTracks().forEach((t) => t.stop())
        audioCtx.close()
      }
      await resume()
      // Switched off while the audio was starting.
      if (stopped) return teardown()
      if (ready) setStatus(audioCtx.state === 'running' ? 'listening' : 'needs-tap')
    }

    start()
    return () => {
      stopped = true
      teardown()
      setStatus('idle')
      setTranscript('')
    }
  }, [active, model, whisperLanguage])

  return {
    status: active ? status : 'idle',
    // 0–1 while the model downloads the first time.
    progress,
    transcript: active ? transcript : '',
  }
}
