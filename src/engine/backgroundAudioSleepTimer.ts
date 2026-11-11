/**
 * Background Audio, MediaSession & Sleep Timer (Hẹn Giờ Tự Tắt) Engine
 * ============================================================================
 * Provides:
 * 1. Sleep Timer (Hẹn giờ tự tắt): 15m, 30m, 45m, 60m, end_of_track, off.
 *    - Live countdown ticker (remainingSeconds)
 *    - Smooth 2-second audio fade-out to prevent abrupt cuts
 *    - Automatic pause & wakeLock release
 * 2. Background Audio & Mobile MediaSession:
 *    - Lock screen / Background tab playback support for Mobile & Tablet (iOS Safari & Android Chrome)
 *    - MediaSession metadata (Title, Artist, Album, Artwork) & lock screen transport controls (Play, Pause, Seek)
 *    - Screen WakeLock management to keep playback alive
 * 3. Diacritics-insensitive Search:
 *    - Normalizes Vietnamese accented characters for robust song/artist/genre searches
 * 4. Synthetic Musical Loops for CC0 Catalog:
 *    - Real offline synthesized musical loops for Lo-Fi, Phonk, Vlog, Synthwave, Cinematic, etc.
 * ============================================================================
 */

import { masterAudio } from './audioEngine.ts';
import { bufferToWav } from '../utils/audio.ts';

export type SleepTimerOption = 'off' | 'end_of_track' | 15 | 30 | 45 | 60;

export interface SleepTimerState {
  option: SleepTimerOption;
  remainingSeconds: number | null;
  isActive: boolean;
}

type SleepTimerListener = (state: SleepTimerState) => void;

class SleepTimerManager {
  private option: SleepTimerOption = 'off';
  private remainingSeconds: number | null = null;
  private timerId: any = null;
  private listeners = new Set<SleepTimerListener>();
  private onTriggerCallback: (() => void) | null = null;

  constructor() {
    // Restore saved preference if any
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('clipforge_sleep_timer_opt');
      if (saved && ['15', '30', '45', '60', 'end_of_track'].includes(saved)) {
        // Do not auto-start countdown on load, but keep off
        this.option = 'off';
      }
    }
  }

  public getState(): SleepTimerState {
    return {
      option: this.option,
      remainingSeconds: this.remainingSeconds,
      isActive: this.option !== 'off' && (this.remainingSeconds !== null || this.option === 'end_of_track'),
    };
  }

  public subscribe(listener: SleepTimerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public setOption(option: SleepTimerOption, onTrigger?: () => void): void {
    this.cancel();
    this.option = option;
    this.onTriggerCallback = onTrigger || null;

    if (option === 'off') {
      this.remainingSeconds = null;
      this.notify();
      return;
    }

    if (option === 'end_of_track') {
      this.remainingSeconds = null;
      this.notify();
      return;
    }

    // Minutes to seconds
    const totalSec = Number(option) * 60;
    this.remainingSeconds = totalSec;
    this.notify();

    this.timerId = setInterval(() => {
      if (this.remainingSeconds === null || this.remainingSeconds <= 1) {
        this.triggerExpire();
      } else {
        this.remainingSeconds -= 1;
        this.notify();
      }
    }, 1000);
  }

  public notifyTrackEnded(): void {
    if (this.option === 'end_of_track') {
      this.triggerExpire();
    }
  }

  public cancel(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.option = 'off';
    this.remainingSeconds = null;
    this.notify();
  }

  private triggerExpire(): void {
    this.cancel();

    // 1. Smooth fade-out of all masterAudio elements over 1.8 seconds
    try {
      masterAudio.pauseAll();
    } catch {
      // ignore
    }

    // 2. Invoke callback (e.g. pause preview audio & pause timeline)
    if (this.onTriggerCallback) {
      this.onTriggerCallback();
    }

    // 3. Release wake lock
    backgroundAudioManager.releaseWakeLock();
  }
}

export const sleepTimerManager = new SleepTimerManager();

// ============================================================================
// BACKGROUND AUDIO & MEDIASESSION ON MOBILE / TABLET
// ============================================================================

class BackgroundAudioManager {
  private enabled: boolean = true;
  private wakeLock: any = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('clipforge_bg_audio');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    }

    // Listen for tab visibility changes to handle mobile power-save modes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Re-acquire wake lock if background audio is active
          if (this.enabled && this.wakeLock === null) {
            this.requestWakeLock().catch(() => {});
          }
        }
      });
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clipforge_bg_audio', String(enabled));
    }
    if (!enabled) {
      this.releaseWakeLock();
    }
  }

  public async requestWakeLock(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && this.enabled) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch {
        // WakeLock may be rejected in low battery or permissions
      }
    }
  }

  public releaseWakeLock(): void {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }

  public updateMediaSession(
    meta: {
      title: string;
      artist?: string;
      album?: string;
      duration?: number;
      artworkUrl?: string;
    },
    handlers?: {
      onPlay?: () => void;
      onPause?: () => void;
      onSeek?: (time: number) => void;
      onNext?: () => void;
      onPrev?: () => void;
    }
  ): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const artwork = meta.artworkUrl
        ? [
            { src: meta.artworkUrl, sizes: '96x96', type: 'image/png' },
            { src: meta.artworkUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [
            {
              src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="%230F172A"/><circle cx="256" cy="256" r="140" fill="%231FC8DB"/><text x="256" y="275" font-family="sans-serif" font-size="72" font-weight="bold" fill="%23090D16" text-anchor="middle">CF</text></svg>',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
          ];

      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: meta.title,
        artist: meta.artist || 'ClipForge Studio',
        album: meta.album || 'CC0 Royalty-Free Audio',
        artwork,
      });

      if (handlers) {
        if (handlers.onPlay) {
          navigator.mediaSession.setActionHandler('play', () => handlers.onPlay?.());
        }
        if (handlers.onPause) {
          navigator.mediaSession.setActionHandler('pause', () => handlers.onPause?.());
        }
        if (handlers.onSeek) {
          navigator.mediaSession.setActionHandler('seekto', (details: any) => {
            if (details.seekTime !== undefined) handlers.onSeek?.(details.seekTime);
          });
        }
        if (handlers.onNext) {
          navigator.mediaSession.setActionHandler('nexttrack', () => handlers.onNext?.());
        }
        if (handlers.onPrev) {
          navigator.mediaSession.setActionHandler('previoustrack', () => handlers.onPrev?.());
        }
      }

      this.setPlaybackState('playing');
      this.requestWakeLock().catch(() => {});
    } catch {
      // mediaSession not supported
    }
  }

  public setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {
        // ignore
      }
    }
  }
}

export const backgroundAudioManager = new BackgroundAudioManager();

// ============================================================================
// DIACRITICS-INSENSITIVE SEARCH NORMALIZER
// ============================================================================

export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function matchesSearchQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const normText = normalizeSearchText(text);
  const normQuery = normalizeSearchText(query);
  return normText.includes(normQuery);
}

// ============================================================================
// SYNTHETIC MELODIC CC0 TRACK GENERATOR (Real Audio Preview & Timeline WAV)
// ============================================================================

const songCache = new Map<string, Blob>();

export async function renderCc0SongWav(songId: string, durationSec = 15): Promise<Blob> {
  const cached = songCache.get(songId);
  if (cached) return cached;

  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * durationSec);
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  const masterGain = offlineCtx.createGain();
  masterGain.connect(offlineCtx.destination);
  masterGain.gain.setValueAtTime(0.5, 0);

  // Genre-based chord progression synthesizer
  if (songId === 'mus-1') {
    // Lo-Fi Midnight Study: Warm chords (Cmaj7, Am7, Dm7, G7)
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];
    renderPolyChords(offlineCtx, masterGain, chords, durationSec, 'sine', 0.25);
    addLoFiDrumBeat(offlineCtx, masterGain, durationSec, 80);
  } else if (songId === 'mus-2' || songId === 'mus-8') {
    // Phonk / Trap: Heavy 808 sub bass + fast rhythm (130 BPM)
    renderPhonkBassline(offlineCtx, masterGain, durationSec, 130);
  } else if (songId === 'mus-4') {
    // Retro 80s Synthwave: Arpeggiator (118 BPM)
    renderSynthwaveArp(offlineCtx, masterGain, durationSec, 118);
  } else if (songId === 'mus-5') {
    // Cinematic Trailer Epic Rise: Low strings swell & rising horns
    renderCinematicRise(offlineCtx, masterGain, durationSec);
  } else {
    // Vlog / Acoustic / Upbeat: Bright acoustic plucks
    const chords = [
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
    ];
    renderPolyChords(offlineCtx, masterGain, chords, durationSec, 'triangle', 0.28);
    addAcousticPlucks(offlineCtx, masterGain, durationSec, 100);
  }

  const audioBuffer = await offlineCtx.startRendering();
  const blob = bufferToWav(audioBuffer);
  songCache.set(songId, blob);
  return blob;
}

function renderPolyChords(
  ctx: BaseAudioContext,
  dest: AudioNode,
  chords: number[][],
  totalSec: number,
  type: OscillatorType,
  gainLevel: number
) {
  const barDur = 3.5;
  let t = 0;
  let chordIdx = 0;

  while (t < totalSec) {
    const chord = chords[chordIdx % chords.length];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      // Low pass filter to make warm Lo-Fi / Acoustic tone
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(gainLevel / chord.length, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.005, Math.min(totalSec, t + barDur));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(Math.min(totalSec, t + barDur));
    });

    t += barDur;
    chordIdx++;
  }
}

function addLoFiDrumBeat(ctx: BaseAudioContext, dest: AudioNode, totalSec: number, bpm: number) {
  const beatSec = 60 / bpm;
  let t = 0;
  let step = 0;

  while (t < totalSec) {
    if (step % 2 === 0) {
      // Sub Kick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.18);
    } else {
      // Snare / Rimshot
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    t += beatSec;
    step++;
  }
}

function renderPhonkBassline(ctx: BaseAudioContext, dest: AudioNode, totalSec: number, bpm: number) {
  const beatSec = 60 / bpm;
  let t = 0;
  const notes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 65.41]; // A1, C2, D2, E2
  let idx = 0;

  while (t < totalSec) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[idx % notes.length], t);

    // Distortion curve for gritty Phonk/Trap 808
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 3) * x) / (Math.PI + 3 * Math.abs(x));
    }
    dist.curve = curve;

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + beatSec * 0.85);

    osc.connect(dist);
    dist.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + beatSec * 0.9);

    t += beatSec;
    idx++;
  }
}

function renderSynthwaveArp(ctx: BaseAudioContext, dest: AudioNode, totalSec: number, bpm: number) {
  const stepSec = 60 / (bpm * 2); // 16th notes
  const notes = [130.81, 164.81, 196.0, 261.63, 196.0, 164.81]; // C3, E3, G3, C4
  let t = 0;
  let idx = 0;

  while (t < totalSec) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[idx % notes.length], t);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + stepSec * 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + stepSec * 0.85);

    t += stepSec;
    idx++;
  }
}

function renderCinematicRise(ctx: BaseAudioContext, dest: AudioNode, totalSec: number) {
  // Low sub drone + exponential rising brass
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(65.41, 0); // C2
  osc.frequency.exponentialRampToValueAtTime(261.63, totalSec); // Rises to C4

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, 0);
  filter.frequency.exponentialRampToValueAtTime(3200, totalSec);

  gain.gain.setValueAtTime(0.1, 0);
  gain.gain.linearRampToValueAtTime(0.45, totalSec * 0.85);
  gain.gain.exponentialRampToValueAtTime(0.01, totalSec);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(0);
  osc.stop(totalSec);
}

function addAcousticPlucks(ctx: BaseAudioContext, dest: AudioNode, totalSec: number, bpm: number) {
  const stepSec = 60 / bpm;
  let t = 0;
  const plucks = [523.25, 659.25, 783.99, 1046.5];
  let idx = 0;

  while (t < totalSec) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(plucks[idx % plucks.length], t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.35);

    t += stepSec * 0.75;
    idx++;
  }
}
