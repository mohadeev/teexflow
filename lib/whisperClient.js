// app/lib/whisperClient.js
import { pipeline } from '@xenova/transformers';

class WhisperClient {
  constructor() {
    this.pipeline = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * Load the Whisper model via Transformers.js pipeline
   * @param {Function} onProgress - Callback for loading progress
   */
  async load(onProgress) {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    try {
      // Create a pipeline for automatic speech recognition
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-small', // or 'Xenova/whisper-tiny', 'Xenova/whisper-base', 'Xenova/whisper-medium'
        {
          progress_callback: (progress) => {
            if (onProgress && progress.status === 'progress') {
              onProgress({ status: 'progress', progress: progress.progress });
            }
          }
        }
      );

      this.isLoaded = true;
      console.log('✅ Whisper model loaded in browser');
      return true;
    } catch (err) {
      console.error('❌ Failed to load Whisper:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Transcribe audio data (Float32Array) using the loaded model
   * @param {Float32Array} audioData - Audio samples (mono, 16kHz)
   * @returns {Promise<{text: string}>}
   */
  async transcribe(audioData) {
    if (!this.isLoaded) {
      throw new Error('Whisper model not loaded yet.');
    }

    try {
      const result = await this.pipeline(audioData, {
        language: 'en',
        task: 'transcribe',
        return_timestamps: false,
      });
      return { text: result.text };
    } catch (err) {
      console.error('❌ Transcription error:', err);
      throw err;
    }
  }
}

export default WhisperClient;