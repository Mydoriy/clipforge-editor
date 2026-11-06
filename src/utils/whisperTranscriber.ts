// Browser-based Speech-to-Text using Whisper (transformers.js WebGPU / WASM)
import { pipeline, env } from '@xenova/transformers';

// Configure environment: fetch models from HuggingFace CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperProgressUpdate {
  status: 'init' | 'loading' | 'ready' | 'transcribing' | 'done' | 'error';
  progress?: number;
  message?: string;
}

// Convert any Audio/Video Blob to 16kHz mono Float32Array required by Whisper
export async function audioBlobTo16kHzMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);

    // Downmix to mono
    for (let c = 0; c < numChannels; c++) {
      const channelData = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[i] / numChannels;
      }
    }
    return monoData;
  } finally {
    audioCtx.close().catch(() => {});
  }
}

let transcriberInstance: any = null;

// Transcribe audio using in-browser Whisper
export async function transcribeWithWhisper(
  audioFloat32: Float32Array,
  language: string = 'vietnamese',
  onProgress?: (update: WhisperProgressUpdate) => void
): Promise<WhisperSegment[]> {
  try {
    if (!transcriberInstance) {
      onProgress?.({
        status: 'loading',
        progress: 10,
        message: 'Đang tải Whisper model (WebGPU / WASM)...'
      });

      // Check WebGPU availability
      const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
      const device = hasWebGpu ? 'webgpu' : 'wasm';

      transcriberInstance = await (pipeline as any)('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        device,
        progress_callback: (p: any) => {
          if (p.status === 'progress' && p.total) {
            const pct = Math.round((p.loaded / p.total) * 100);
            onProgress?.({
              status: 'loading',
              progress: pct,
              message: `Đang tải mô hình Whisper (${pct}%)...`
            });
          }
        }
      });
    }

    onProgress?.({
      status: 'transcribing',
      progress: 60,
      message: 'Đang giải mã lời nói thành văn bản...'
    });

    const langCode = language === 'vietnamese' ? 'vi' : language === 'english' ? 'en' : undefined;

    const output: any = await transcriberInstance(audioFloat32, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: langCode,
      task: 'transcribe'
    });

    onProgress?.({
      status: 'done',
      progress: 100,
      message: 'Hoàn tất nhận diện giọng nói!'
    });

    const segments: WhisperSegment[] = [];

    if (output && Array.isArray(output.chunks) && output.chunks.length > 0) {
      for (const chunk of output.chunks) {
        const text = (chunk.text || '').trim();
        if (text && chunk.timestamp) {
          const start = chunk.timestamp[0] ?? 0;
          const end = chunk.timestamp[1] ?? (start + 3.0);
          segments.push({
            start: Math.max(0, start),
            end: Math.max(start + 0.5, end),
            text
          });
        }
      }
    } else if (output && typeof output.text === 'string' && output.text.trim()) {
      // Single chunk fallback
      segments.push({
        start: 0,
        end: 4.0,
        text: output.text.trim()
      });
    }

    return segments;
  } catch (err: any) {
    console.error('Whisper transcription failed', err);
    onProgress?.({
      status: 'error',
      message: err?.message || 'Lỗi khi chạy Whisper trong trình duyệt'
    });
    throw err;
  }
}

