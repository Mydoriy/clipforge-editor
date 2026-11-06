import type { TimelineClip } from '../store/useEditorStore';

export interface WaveformData {
  clipId: string;
  peaks: number[]; // normalized 0 to 1
}

export class MasterAudioEngine {
  private ctx: AudioContext | null = null;
  private trackGainNodes = new Map<string, GainNode>();
  private activeSources = new Map<string, AudioBufferSourceNode>();
  private audioBufferCache = new Map<string, AudioBuffer>();
  private waveformCache = new Map<string, number[]>();

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getMasterTime(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  // Load and decode an audio or video file's audio buffer
  public async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.audioBufferCache.get(url);
    if (cached) return cached;

    const ctx = this.getContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.audioBufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  // Generate waveform peaks for timeline display
  public async generateWaveformPeaks(url: string, numPeaks = 80): Promise<number[]> {
    const cached = this.waveformCache.get(url);
    if (cached) return cached;

    try {
      const buffer = await this.loadAudioBuffer(url);
      const rawData = buffer.getChannelData(0);
      const step = Math.floor(rawData.length / numPeaks);
      const peaks: number[] = [];

      for (let i = 0; i < numPeaks; i++) {
        let max = 0;
        const start = i * step;
        const end = Math.min(start + step, rawData.length);
        for (let j = start; j < end; j++) {
          const val = Math.abs(rawData[j]);
          if (val > max) max = val;
        }
        peaks.push(Math.min(1, Math.max(0.1, max)));
      }

      this.waveformCache.set(url, peaks);
      return peaks;
    } catch (e) {
      // Fallback synthetic waveform
      const fallbackPeaks = Array.from({ length: numPeaks }).map((_, i) =>
        Math.abs(Math.sin(i * 0.3) * 0.7 + Math.cos(i * 0.6) * 0.3)
      );
      this.waveformCache.set(url, fallbackPeaks);
      return fallbackPeaks;
    }
  }

  // Clear waveform and audio buffer caches to free memory
  public clearCache(): void {
    this.audioBufferCache.clear();
    this.waveformCache.clear();
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.audioElements.clear();
  }

  // Play synthesized preview chime or beat
  public playSynthesizer(type: 'success' | 'click' | 'beat' = 'click'): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'beat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Active HTMLAudioElement pool for synchronized multi-track playback
  private audioElements = new Map<string, HTMLAudioElement>();

  public syncClips(
    clips: TimelineClip[],
    currentTime: number,
    isPlaying: boolean,
    mutedTracks?: Set<string>
  ): void {
    if (!isPlaying) {
      this.pauseAll();
      return;
    }

    const activeIds = new Set<string>();

    for (const clip of clips) {
      // Audio or video clips with a source
      if ((clip.type === 'audio' || clip.track === 'audio' || clip.type === 'video') && clip.src) {
        const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;
        if (isActive) {
          activeIds.add(clip.id);
          let audio = this.audioElements.get(clip.id);
          if (!audio || audio.src !== clip.src) {
            audio = new Audio(clip.src);
            audio.crossOrigin = 'anonymous';
            this.audioElements.set(clip.id, audio);
          }

          let targetTime = (currentTime - clip.start) * (clip.speed || 1) + (clip.inPoint || 0);
          if (clip.reverse) {
            const endPoint = clip.outPoint || ((clip.inPoint || 0) + clip.duration);
            targetTime = Math.max(clip.inPoint || 0, endPoint - (currentTime - clip.start) * (clip.speed || 1));
          }

          // A/V sync threshold: keep drift strictly <= 40ms
          if (Math.abs(audio.currentTime - targetTime) > 0.04) {
            audio.currentTime = targetTime;
          }

          const desiredRate = Math.max(0.25, Math.min(4, clip.speed || 1));
          if (audio.playbackRate !== desiredRate) {
            audio.playbackRate = desiredRate;
          }

          // Volume computation with fade-in and fade-out
          const isMuted = !!(clip.track && mutedTracks?.has(clip.track));
          if (isMuted) {
            audio.volume = 0;
          } else {
            let vol = clip.volume !== undefined ? clip.volume : 1.0;
            const elapsed = currentTime - clip.start;
            const remaining = clip.start + clip.duration - currentTime;

            if (clip.fadeIn && clip.fadeIn > 0 && elapsed < clip.fadeIn) {
              vol *= elapsed / clip.fadeIn;
            }
            if (clip.fadeOut && clip.fadeOut > 0 && remaining < clip.fadeOut) {
              vol *= Math.max(0, remaining / clip.fadeOut);
            }
            audio.volume = Math.max(0, Math.min(1, vol));
          }

          if (audio.paused) {
            audio.play().catch(() => {});
          }
        }
      }
    }

    // Pause clips that are no longer active
    for (const [id, audio] of this.audioElements.entries()) {
      if (!activeIds.has(id) && !audio.paused) {
        audio.pause();
      }
    }
  }

  public pauseAll(): void {
    for (const audio of this.audioElements.values()) {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }
}

export const masterAudio = new MasterAudioEngine();

