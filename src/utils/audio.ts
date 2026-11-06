// Web Audio API Sound Synthesizer, WAV Encoder, and Audio Extractor

export function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export type SfxType =
  | 'whoosh'
  | 'pop'
  | 'click'
  | 'ding'
  | 'riser'
  | 'laser'
  | 'glitch'
  | 'drop'
  | 'sweep'
  | 'success'
  | 'beat';

export interface SfxMeta {
  type: SfxType;
  name: string;
  category: 'Impact' | 'Chime' | 'Movement' | 'Modern';
  duration: number;
}

export const SFX_CATALOG: SfxMeta[] = [
  { type: 'whoosh', name: 'Whoosh Lướt Nhanh', category: 'Movement', duration: 0.6 },
  { type: 'pop', name: 'Pop Bong Bóng', category: 'Impact', duration: 0.2 },
  { type: 'click', name: 'UI Click Nhẹ', category: 'Impact', duration: 0.1 },
  { type: 'ding', name: 'Ding Chuông Keng', category: 'Chime', duration: 1.2 },
  { type: 'riser', name: 'Riser Cao Trào Kịch Tính', category: 'Movement', duration: 3.0 },
  { type: 'laser', name: 'Laser Bắn Nhanh', category: 'Modern', duration: 0.35 },
  { type: 'glitch', name: 'Glitch Nhiễu Âm', category: 'Modern', duration: 0.4 },
  { type: 'drop', name: 'Sub Bass 808 Drop', category: 'Impact', duration: 1.8 },
  { type: 'sweep', name: 'Sweep Lướt Âm Vòm', category: 'Movement', duration: 1.5 },
  { type: 'success', name: 'Thành Công (C5-E5-G5)', category: 'Chime', duration: 0.8 },
  { type: 'beat', name: 'Sub Bass Kick Beat', category: 'Impact', duration: 0.4 }
];

class AudioManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private buildSfxGraph(ctx: BaseAudioContext, type: SfxType, startTime: number = 0) {
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    if (type === 'whoosh') {
      const bufferSize = ctx.sampleRate * 0.6;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, startTime);
      filter.frequency.exponentialRampToValueAtTime(2800, startTime + 0.3);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + 0.6);
      filter.Q.setValueAtTime(3.0, startTime);

      masterGain.gain.setValueAtTime(0.01, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.3);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(startTime);
      whiteNoise.stop(startTime + 0.6);
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, startTime);
      osc.frequency.exponentialRampToValueAtTime(120, startTime + 0.08);

      masterGain.gain.setValueAtTime(0.45, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.08);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, startTime);
      osc.frequency.exponentialRampToValueAtTime(300, startTime + 0.04);

      masterGain.gain.setValueAtTime(0.3, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.04);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.04);
    } else if (type === 'ding') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, startTime); // C6
      osc2.frequency.setValueAtTime(2093.0, startTime); // C7

      masterGain.gain.setValueAtTime(0.35, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc1.connect(masterGain);
      osc2.connect(masterGain);
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 1.2);
      osc2.stop(startTime + 1.2);
    } else if (type === 'riser') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, startTime);
      osc.frequency.exponentialRampToValueAtTime(1100, startTime + 3.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, startTime);
      filter.frequency.exponentialRampToValueAtTime(5000, startTime + 3.0);

      masterGain.gain.setValueAtTime(0.02, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.4, startTime + 2.8);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 3.0);

      osc.connect(filter);
      filter.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 3.0);
    } else if (type === 'laser') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, startTime);
      osc.frequency.exponentialRampToValueAtTime(140, startTime + 0.25);

      masterGain.gain.setValueAtTime(0.3, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    } else if (type === 'glitch') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, startTime);
      osc.frequency.setValueAtTime(120, startTime + 0.08);
      osc.frequency.setValueAtTime(800, startTime + 0.16);
      osc.frequency.setValueAtTime(200, startTime + 0.25);

      masterGain.gain.setValueAtTime(0.25, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    } else if (type === 'drop') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, startTime);
      osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.4);

      masterGain.gain.setValueAtTime(0.6, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.8);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 1.8);
    } else if (type === 'sweep') {
      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, startTime);
      filter.frequency.exponentialRampToValueAtTime(3500, startTime + 1.4);

      masterGain.gain.setValueAtTime(0.01, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.35, startTime + 1.3);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(startTime);
      whiteNoise.stop(startTime + 1.5);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);
        noteGain.gain.setValueAtTime(0.25, startTime + idx * 0.12);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.12 + 0.45);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + idx * 0.12);
        osc.stop(startTime + idx * 0.12 + 0.45);
      });
    } else if (type === 'beat') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.2);

      masterGain.gain.setValueAtTime(0.5, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  }

  // Play preview chime or SFX instantly in browser
  playSfx(type: SfxType) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      this.buildSfxGraph(this.ctx, type, this.ctx.currentTime);
    } catch (e) {
      console.warn('Audio playback prevented or not supported', e);
    }
  }

  // Backward-compatible alias
  playChime(type: 'success' | 'click' | 'beat' = 'click') {
    this.playSfx(type);
  }

  // Offline render to real 16-bit PCM WAV Blob
  async renderSfxWav(type: SfxType): Promise<Blob> {
    const meta = SFX_CATALOG.find((s) => s.type === type) || { duration: 1.0 };
    const sampleRate = 44100;
    const length = Math.ceil(sampleRate * meta.duration);
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    this.buildSfxGraph(offlineCtx, type, 0);
    const renderedBuffer = await offlineCtx.startRendering();
    return bufferToWav(renderedBuffer);
  }
}

export const audioManager = new AudioManager();

// Extract Audio Track from any video file/blob into a WAV Blob
export async function extractAudioFromVideo(fileOrBlob: Blob): Promise<{ blob: Blob; duration: number }> {
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioCtx();
  try {
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    const wavBlob = bufferToWav(audioBuffer);
    return { blob: wavBlob, duration: audioBuffer.duration };
  } finally {
    tempCtx.close().catch(() => {});
  }
}

// Generate simple synthetic formant speech WAV for offline TTS clip insertion
export async function synthesizeSpeechWav(text: string, durationSec: number = 3): Promise<Blob> {
  const sampleRate = 22050;
  const length = Math.max(1, Math.ceil(sampleRate * durationSec));
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);

  const osc = offlineCtx.createOscillator();
  const filter = offlineCtx.createBiquadFilter();
  const gain = offlineCtx.createGain();

  osc.type = 'sawtooth';
  // Natural speech pitch fluctuation 140Hz to 190Hz
  osc.frequency.setValueAtTime(160, 0);
  for (let t = 0; t < durationSec; t += 0.25) {
    const wobble = 150 + Math.sin(t * 8) * 25 + Math.random() * 10;
    osc.frequency.linearRampToValueAtTime(wobble, t);
  }

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, 0);
  filter.Q.setValueAtTime(4, 0);

  // Modulation to simulate syllables
  gain.gain.setValueAtTime(0.01, 0);
  const syllables = Math.max(3, Math.round(text.length / 4));
  const syllableDur = durationSec / syllables;
  for (let i = 0; i < syllables; i++) {
    const sStart = i * syllableDur;
    gain.gain.setValueAtTime(0.01, sStart);
    gain.gain.linearRampToValueAtTime(0.35, sStart + syllableDur * 0.2);
    gain.gain.linearRampToValueAtTime(0.01, sStart + syllableDur * 0.9);
  }

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(offlineCtx.destination);

  osc.start(0);
  osc.stop(durationSec);

  const audioBuffer = await offlineCtx.startRendering();
  return bufferToWav(audioBuffer);
}
