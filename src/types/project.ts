// ==========================================
// CAPCUT DESKTOP WEB - FORMAL DATA MODEL
// ==========================================

export type AspectRatio = 'original' | '9:16' | '16:9' | '1:1' | '4:3' | '3:4' | '21:9' | 'custom';
export type ResolutionPreset = 'adapted' | '720p' | '1080p' | '2k' | '4k' | { w: number; h: number };
export type FpsPreset = 24 | 25 | 30 | 50 | 60;
export type ImportMode = 'original' | 'copy';

export interface ProjectSettings {
  aspect: AspectRatio;
  resolution: ResolutionPreset;
  fps: FpsPreset;
  floatingPoint: boolean;
  importMode: ImportMode;
  arrangeLayers: boolean;
  proxy: boolean;
  colorSpace?: 'sRGB' | 'Display P3' | 'Rec. 2020';
}

export type TrackType = 'video' | 'audio' | 'text' | 'sticker' | 'effect' | 'filter' | 'adjustment';

export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  anchor?: { x: number; y: number };
}

export interface ClipFilter {
  id: string;
  name?: string;
  intensity: number; // 0 to 100
}

export interface ClipAnimation {
  in?: string;
  out?: string;
  combo?: string;
}

export interface ClipAdjustments {
  brightness?: number; // -50 to 50
  contrast?: number;   // -50 to 50
  saturation?: number; // -50 to 50
  temperature?: number;
  tint?: number;
  sharpness?: number;
  [key: string]: number | undefined;
}

export interface Clip {
  id: string;
  mediaId?: string;
  trackId?: string;
  start: number;       // in seconds
  duration: number;    // in seconds
  inPoint: number;     // trim head offset in seconds
  outPoint: number;    // trim tail offset in seconds
  speed: number;       // 0.25 to 4.0
  speedCurve?: number[] | { points: Array<{ x: number; y: number }> };
  reverse?: boolean;
  transform: ClipTransform;
  opacity: number;     // 0 to 1
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | string;
  volume?: number;     // 0 to 1.5
  fadeIn?: number;     // in seconds
  fadeOut?: number;    // in seconds
  filter?: ClipFilter | string;
  adjustments: ClipAdjustments;
  effects: any[];
  mask?: 'none' | 'rect' | 'circle' | { type: string; feather?: number; invert?: boolean };
  chromaKey?: { enabled: boolean; color?: string; similarity?: number; smoothness?: number };
  animation: ClipAnimation;
  linkedGroupId?: string;
  groupId?: string;
  isCompound?: boolean;
  compoundClips?: any[];
  locked?: boolean;
  transitionIn?: { type: string; duration: number };
  text?: string;
  sticker?: string;

  // Flattened & backward-compatible aliases for legacy callers
  name?: string;
  type?: string;
  track?: TrackType;
  src?: string;
  proxySrc?: string;
  isProxyReady?: boolean;
  waveformPeaks?: number[];
  thumbnailUrl?: string;
  fit?: 'blur_fill' | 'cover' | 'contain' | 'crop_pan';
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  textAnimIn?: string;
  textAnimOut?: string;
  textBgColor?: string;
  [key: string]: any;
  eqLow?: number;
  eqMid?: number;
  eqHigh?: number;
  noiseReduction?: boolean;
  particleType?: string;

  // Text Styling & Typography
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textStroke?: { color: string; width: number };
  textShadow?: { color: string; blur: number; x: number; y: number };
  textBg?: { color: string; padding: number; radius: number };
  textPreset?: string;

  // Shapes & Vector Stickers
  stickerShape?: 'rect' | 'circle' | 'star' | 'heart' | 'triangle' | 'arrow' | 'frame' | 'divider';
  stickerFill?: string;
  stickerStroke?: string;

  // Transitions
  transitionType?: string;
  transitionDuration?: number;

  // Video Effects
  effectType?: string;
  effectIntensity?: number;
  effectSpeed?: number;
  filterIntensity?: number;

  // Video & Audio Extended Properties
  flipX?: boolean;
  flipY?: boolean;
  backgroundConfig?: { type: 'none' | 'blur' | 'color'; color?: string; blur?: number };
  voiceChanger?: string;
  eqBands?: number[];
  textGlow?: { color: string; blur: number };
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  hasError?: boolean;
  missingMedia?: boolean;
  refOnly?: boolean;
  isReferenceOnly?: boolean;
}

export interface Track {
  id: string;
  type: TrackType;
  order: number;
  isMain: boolean;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  height: number;
  clips: Clip[];
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

// Mỗi Timeline là một "Subproject" lồng được (Nested Subprojects)
export interface Timeline {
  id: string;
  name: string;
  tracks: Track[];
  markers: TimelineMarker[];
  duration: number;
}

export interface MediaItem {
  id: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  size: number;
  handle?: FileSystemFileHandle;
  blobKey?: string | Blob;
  thumbnails?: string[] | string;
  waveform?: number[];
  proxyKey?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ProjectSettings;
  timelines: Timeline[];
  activeTimelineId: string;
  media: MediaItem[];
}

// ==========================================
// FACTORY & NORMALIZATION UTILITIES
// ==========================================

export function createDefaultProjectSettings(partial: Partial<ProjectSettings> = {}): ProjectSettings {
  return {
    aspect: '9:16',
    resolution: '1080p',
    fps: 30,
    floatingPoint: false,
    importMode: 'original',
    arrangeLayers: true,
    proxy: false,
    colorSpace: 'sRGB',
    ...partial
  };
}

export function createDefaultTracks(): Track[] {
  return [
    {
      id: 'track-text',
      type: 'text',
      order: 0,
      isMain: false,
      locked: false,
      hidden: false,
      muted: false,
      height: 40,
      clips: []
    },
    {
      id: 'track-sticker',
      type: 'sticker',
      order: 1,
      isMain: false,
      locked: false,
      hidden: false,
      muted: false,
      height: 40,
      clips: []
    },
    {
      id: 'track-video-main',
      type: 'video',
      order: 2,
      isMain: true,
      locked: false,
      hidden: false,
      muted: false,
      height: 48,
      clips: []
    },
    {
      id: 'track-audio-bgm',
      type: 'audio',
      order: 3,
      isMain: false,
      locked: false,
      hidden: false,
      muted: false,
      height: 40,
      clips: []
    },
    {
      id: 'track-effect',
      type: 'effect',
      order: 4,
      isMain: false,
      locked: false,
      hidden: false,
      muted: false,
      height: 36,
      clips: []
    }
  ];
}

export function createDefaultTimeline(
  id: string = 'timeline-main',
  name: string = 'Main Timeline',
  duration: number = 15
): Timeline {
  return {
    id,
    name,
    tracks: createDefaultTracks(),
    markers: [],
    duration
  };
}

export function createClip(partial: Partial<Clip>): Clip {
  const transform: ClipTransform = partial.transform || {
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    scale: partial.scale ?? 1,
    rotation: partial.rotation ?? 0,
    flipX: false,
    flipY: false,
    anchor: { x: 0.5, y: 0.5 }
  };

  const id = partial.id || 'clip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const track = partial.track || 'video';
  const duration = partial.duration ?? 5;

  return {
    id,
    mediaId: partial.mediaId,
    trackId: partial.trackId,
    start: partial.start ?? 0,
    duration,
    inPoint: partial.inPoint ?? 0,
    outPoint: partial.outPoint ?? duration,
    speed: partial.speed ?? 1,
    speedCurve: partial.speedCurve,
    reverse: partial.reverse ?? false,
    transform,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'normal',
    volume: partial.volume ?? 1,
    fadeIn: partial.fadeIn ?? 0,
    fadeOut: partial.fadeOut ?? 0,
    filter: partial.filter,
    adjustments: partial.adjustments ?? {
      brightness: partial.brightness ?? 0,
      contrast: partial.contrast ?? 0,
      saturation: partial.saturation ?? 0
    },
    effects: partial.effects ?? [],
    mask: partial.mask ?? 'none',
    chromaKey: partial.chromaKey,
    animation: partial.animation ?? {
      in: partial.textAnimIn ?? 'none',
      out: partial.textAnimOut ?? 'none'
    },
    linkedGroupId: partial.linkedGroupId,
    transitionIn: partial.transitionIn,
    text: partial.text,
    sticker: partial.sticker,

    // Aliases
    name: partial.name || 'Clip',
    type: partial.type || (track as string),
    track,
    src: partial.src,
    proxySrc: partial.proxySrc,
    isProxyReady: partial.isProxyReady,
    waveformPeaks: partial.waveformPeaks,
    thumbnailUrl: partial.thumbnailUrl,
    fit: partial.fit ?? 'blur_fill',
    x: transform.x,
    y: transform.y,
    scale: transform.scale,
    rotation: transform.rotation,
    brightness: partial.brightness ?? partial.adjustments?.brightness ?? 0,
    contrast: partial.contrast ?? partial.adjustments?.contrast ?? 0,
    saturation: partial.saturation ?? partial.adjustments?.saturation ?? 0,
    textAnimIn: partial.textAnimIn ?? partial.animation?.in,
    textAnimOut: partial.textAnimOut ?? partial.animation?.out,
    eqLow: partial.eqLow,
    eqMid: partial.eqMid,
    eqHigh: partial.eqHigh,
    noiseReduction: partial.noiseReduction,
    particleType: partial.particleType,

    textColor: partial.textColor,
    fontFamily: partial.fontFamily,
    fontSize: partial.fontSize,
    textStroke: partial.textStroke,
    textShadow: partial.textShadow,
    textBg: partial.textBg,
    textPreset: partial.textPreset,

    stickerShape: partial.stickerShape,
    stickerFill: partial.stickerFill,
    stickerStroke: partial.stickerStroke,

    transitionType: partial.transitionType ?? partial.transitionIn?.type,
    transitionDuration: partial.transitionDuration ?? partial.transitionIn?.duration ?? 1.0,

    effectType: partial.effectType,
    effectIntensity: partial.effectIntensity ?? 50,
    effectSpeed: partial.effectSpeed ?? 1.0
  };
}

export function createDefaultProject(
  id: string = 'proj-' + Date.now(),
  name: string = '0917 - New Project',
  options: Partial<ProjectSettings> = {}
): Project {
  const mainTimeline = createDefaultTimeline();
  return {
    id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: createDefaultProjectSettings(options),
    timelines: [mainTimeline],
    activeTimelineId: mainTimeline.id,
    media: []
  };
}

// Convert flat clips array into tracks structure
export function syncClipsToTracks(tracks: Track[], clips: Clip[]): Track[] {
  return tracks.map((track) => ({
    ...track,
    clips: clips.filter((c) => (c.trackId ? c.trackId === track.id : c.track === track.type))
  }));
}

// Extract flat clips array from tracks
export function extractClipsFromTracks(tracks: Track[]): Clip[] {
  const all: Clip[] = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      all.push({
        ...clip,
        track: clip.track || track.type,
        trackId: track.id
      });
    }
  }
  return all.sort((a, b) => a.start - b.start);
}

