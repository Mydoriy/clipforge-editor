import type { TimelineClip } from '../store/useEditorStore';
import { FILTER_PRESETS } from '../utils/lutParser.ts';
import { renderDynamicEffect, renderGhostPlaceholder } from './dynamicEffectEngine.ts';

export interface RenderOptions {
  isExport?: boolean;
  isProxy?: boolean;
  showSafeZone?: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

export class FrameCompositor {
  private imageCache = new Map<string, HTMLImageElement>();
  private videoCache = new Map<string, HTMLVideoElement>();
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  // Memory bounds to prevent memory leaks during 30+ min continuous editing
  private readonly MAX_VIDEO_CACHE = 8;
  private readonly MAX_IMAGE_CACHE = 30;

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    } else {
      this.offscreenCanvas = null as any;
      this.offscreenCtx = null;
    }
  }

  // Pre-load or retrieve video element synced to time with LRU cache eviction
  public getVideoElement(src: string): HTMLVideoElement {
    const cached = this.videoCache.get(src);
    if (cached) {
      // Re-insert to mark as recently used
      this.videoCache.delete(src);
      this.videoCache.set(src, cached);
      return cached;
    }

    // Evict oldest video element if exceeding max capacity
    if (this.videoCache.size >= this.MAX_VIDEO_CACHE) {
      const oldestKey = this.videoCache.keys().next().value;
      if (oldestKey) {
        const oldVideo = this.videoCache.get(oldestKey);
        if (oldVideo) {
          try {
            oldVideo.pause();
            oldVideo.removeAttribute('src');
            oldVideo.load();
          } catch (e) {
            // Ignore unload errors
          }
        }
        this.videoCache.delete(oldestKey);
      }
    }

    let video: HTMLVideoElement;
    if (typeof document !== 'undefined') {
      video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
    } else {
      video = { src, pause: () => {}, removeAttribute: () => {}, load: () => {} } as any;
    }
    this.videoCache.set(src, video);
    return video;
  }

  // Pre-load or retrieve image element with LRU cache eviction
  public getImageElement(src: string): HTMLImageElement {
    const cached = this.imageCache.get(src);
    if (cached) {
      this.imageCache.delete(src);
      this.imageCache.set(src, cached);
      return cached;
    }

    // Evict oldest image element if exceeding max capacity
    if (this.imageCache.size >= this.MAX_IMAGE_CACHE) {
      const oldestKey = this.imageCache.keys().next().value;
      if (oldestKey) {
        const oldImg = this.imageCache.get(oldestKey);
        if (oldImg) {
          try {
            oldImg.removeAttribute('src');
          } catch (e) {
            // Ignore
          }
        }
        this.imageCache.delete(oldestKey);
      }
    }

    let img: HTMLImageElement;
    if (typeof Image !== 'undefined') {
      img = new Image();
      img.src = src;
      img.crossOrigin = 'anonymous';
    } else {
      img = { src, removeAttribute: () => {} } as any;
    }
    this.imageCache.set(src, img);
    return img;
  }

  // Release cached media elements and canvases on project close
  public cleanup(): void {
    for (const video of this.videoCache.values()) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {
        console.warn('Error releasing video element:', e);
      }
    }
    this.videoCache.clear();

    for (const img of this.imageCache.values()) {
      try {
        img.removeAttribute('src');
      } catch (e) {
        // Ignore
      }
    }
    this.imageCache.clear();

    // Free scratch GPU canvas memory
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = 1;
      this.offscreenCanvas.height = 1;
    }
  }

  // Master Deterministic Render Function (used for both Preview and Export)
  public renderFrame(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    clips: TimelineClip[],
    currentTime: number,
    options: RenderOptions = {}
  ): void {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = (canvas as any).getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    if (!ctx) return;

    // 1. CLEAR & BACKGROUND
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(0.5, '#0e1422');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // CHỐT CHẶN XUẤT: Khi ở chế độ export, loại bỏ 100% mọi lớp refOnly (hình và tiếng)
    const effectiveClips = options.isExport
      ? clips.filter((c) => !c.refOnly && !c.isReferenceOnly && (c as any).role !== 'reference')
      : clips;

    // Filter active clips at current timestamp
    const activeClips = effectiveClips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration);
    const scaleFactor = width / 540;

    // Check if camera shake is active from any effect clip
    const activeEffectClips = activeClips.filter((c) => c.track === 'effect' || c.type === 'effect' || c.effectType);
    const shakeEffect = activeEffectClips.find((c) => (c.effectType || c.name?.toLowerCase().includes('shake')));
    let shakeX = 0;
    let shakeY = 0;
    if (shakeEffect) {
      const speed = shakeEffect.effectSpeed || 1.0;
      const intensity = (shakeEffect.effectIntensity || 50) / 100;
      shakeX = Math.sin(currentTime * 35 * speed) * intensity * 12 * scaleFactor;
      shakeY = Math.cos(currentTime * 28 * speed) * intensity * 8 * scaleFactor;
    }

    ctx.save();
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.translate(shakeX, shakeY);
    }

    // 2. VIDEO & IMAGE TRACKS
    const visualClips = activeClips.filter((c) => c.track === 'video' || c.type === 'image' || c.type === 'video');
    for (const clip of visualClips) {
      this.renderVisualClip(ctx, clip, currentTime, width, height, scaleFactor, options);
    }

    // 2.3 FILTER TRACKS
    const filterClips = activeClips.filter((c) => c.track === 'filter' || c.type === 'filter');
    for (const fClip of filterClips) {
      this.applyFilterTrack(ctx, fClip, width, height);
    }

    // 2.5 ADJUSTMENT LAYER TRACKS
    const adjustmentClips = activeClips.filter((c) => c.track === 'adjustment' || c.type === 'adjustment');
    for (const adj of adjustmentClips) {
      this.applyAdjustmentLayer(ctx, adj, width, height);
    }

    // 2.8 VIDEO EFFECTS (Canvas / Shader Overlays)
    for (const effClip of activeEffectClips) {
      this.renderVideoEffect(ctx, effClip, currentTime, width, height, scaleFactor);
    }

    // 3. STICKER & EMOJI & SHAPE TRACKS
    const stickerClips = activeClips.filter((c) => c.track === 'sticker');
    for (const sticker of stickerClips) {
      this.renderStickerClip(ctx, sticker, currentTime, width, height, scaleFactor);
    }

    // 4. TEXT & CAPTION TRACKS
    const textClips = activeClips.filter((c) => c.track === 'text');
    for (const textClip of textClips) {
      this.renderTextClip(ctx, textClip, currentTime, width, height, scaleFactor);
    }

    // 5. PROCEDURAL PARTICLES & CONFETTI
    const particleClip = activeClips.find((c) => c.particleType);
    if (particleClip) {
      this.renderParticles(ctx, particleClip, currentTime, width, height, scaleFactor);
    }

    ctx.restore();

    // 6. SAFE ZONE OVERLAY (Preview only - never in export)
    if (options.showSafeZone && !options.isExport) {
      this.renderSafeZone(ctx, width, height, scaleFactor);
    }
  }

  // Render a Video or Image clip with Blur Fill, Pan, Transforms, Filters & Transitions
  private renderVisualClip(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    currentTime: number,
    canvasW: number,
    canvasH: number,
    scaleFactor: number,
    options: RenderOptions
  ): void {
    ctx.save();

    // Opacity
    let clipAlpha = clip.opacity ?? 1;
    if (clip.refOnly || clip.isReferenceOnly) {
      clipAlpha = Math.min(clipAlpha, 0.35); // Lớp tham chiếu hiển thị mờ
    }

    // Position, Scale & Rotation (including smartphone EXIF / orientation metadata)
    let posX = canvasW / 2 + (clip.x || 0) * scaleFactor;
    let posY = canvasH / 2 + (clip.y || 0) * scaleFactor;
    let clipScale = (clip.scale || 1);
    let clipRotation = (clip.rotation || 0) + ((clip as any).mediaRotation || 0);
    let clipScaleX = 1;

    // 3.6 NESTED COMPOUND CLIPS RENDERER
    if (clip.compoundClips && clip.compoundClips.length > 0) {
      const localTime = Math.max(0, (currentTime - clip.start) * (clip.speed || 1));
      for (const child of clip.compoundClips) {
        if (localTime >= child.start && localTime <= child.start + child.duration) {
          if (child.track === 'video' || child.type === 'image' || child.type === 'video' || child.compoundClips) {
            this.renderVisualClip(ctx, child, localTime, canvasW, canvasH, scaleFactor, options);
          } else if (child.track === 'text' || child.type === 'text') {
            this.renderTextClip(ctx, child, localTime, canvasW, canvasH, scaleFactor);
          } else if (child.track === 'sticker' || child.type === 'sticker') {
            this.renderStickerClip(ctx, child, localTime, canvasW, canvasH, scaleFactor);
          }
        }
      }
      ctx.restore();
      return;
    }

    // 3.6 TRANSITION IN ENGINE
    const transType = clip.transitionType || clip.transitionIn?.type;
    const transDur = clip.transitionDuration || clip.transitionIn?.duration || 1.0;
    const timeInClip = currentTime - clip.start;

    if (transType && transType !== 'none' && timeInClip >= 0 && timeInClip < transDur) {
      const p = Math.min(1, Math.max(0, timeInClip / transDur));
      if (transType === 'fade' || transType === 'dissolve') {
        clipAlpha *= p;
      } else if (transType === 'slideLeft') {
        posX += canvasW * (1 - p);
      } else if (transType === 'slideRight') {
        posX -= canvasW * (1 - p);
      } else if (transType === 'slideUp') {
        posY += canvasH * (1 - p);
      } else if (transType === 'slideDown') {
        posY -= canvasH * (1 - p);
      } else if (transType === 'zoom') {
        clipScale *= (0.2 + 0.8 * p);
      } else if (transType === 'spin') {
        clipRotation += (1 - p) * 360;
        clipScale *= Math.max(0.1, p);
      } else if (transType === 'flip') {
        clipScaleX = Math.max(0.01, Math.cos((1 - p) * Math.PI / 2));
      } else if (transType === 'glitch') {
        if (Math.random() > 0.35) {
          posX += (Math.random() - 0.5) * 50 * (1 - p) * scaleFactor;
        }
      } else if (transType === 'blur') {
        ctx.filter = `blur(${Math.round((1 - p) * 20)}px)`;
      } else if (transType === 'push') {
        const ease = 1 - Math.pow(1 - p, 3);
        posX += canvasW * (1 - ease);
      } else if (transType === 'wipe') {
        ctx.beginPath();
        ctx.rect(-canvasW / 2, -canvasH / 2, canvasW * p, canvasH);
        ctx.clip();
      }
    }

    ctx.globalAlpha = clipAlpha;
    ctx.translate(posX, posY);

    if (clipRotation) {
      ctx.rotate((clipRotation * Math.PI) / 180);
    }
    ctx.scale(clipScale * clipScaleX, clipScale);

    // Color Grading & Filters
    const b = 100 + (clip.brightness || 0);
    const c = 100 + (clip.contrast || 0);
    const s = 100 + (clip.saturation || 0);

    let filterCss = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    const filterId = typeof clip.filter === 'object' ? (clip.filter as any).id : clip.filter;
    const filterInt = (typeof clip.filter === 'object' ? (clip.filter as any).intensity : (clip as any).filterIntensity) ?? 80;
    const matchedPreset = FILTER_PRESETS.find((f) => f.id === filterId);
    if (matchedPreset && matchedPreset.id !== 'none') {
      filterCss += ' ' + matchedPreset.cssFilter(filterInt);
    } else {
      if (clip.filter === 'noir') filterCss += ' grayscale(100%)';
      else if (clip.filter === 'vintage') filterCss += ' sepia(60%)';
      else if (clip.filter === 'warm') filterCss += ' sepia(25%) saturate(140%)';
      else if (clip.filter === 'cinematic') filterCss += ' contrast(115%) saturate(125%)';
      else if (clip.filter === 'vhs') filterCss += ' hue-rotate(20deg) contrast(110%)';
      else if (clip.filter === 'cyberpunk') filterCss += ' hue-rotate(180deg) saturate(180%)';
      else if (clip.filter === 'vivid') filterCss += ' saturate(160%) contrast(110%)';
    }

    ctx.filter = filterCss;

    const sourceSrc = (options.isProxy && clip.proxySrc) ? clip.proxySrc : clip.src;

    if (sourceSrc) {
      const isTransparent = sourceSrc.endsWith('.png') || sourceSrc.endsWith('.webp') || sourceSrc.includes('alpha') || clip.type === 'image';

      if (clip.type === 'image' || sourceSrc.startsWith('data:image') || sourceSrc.endsWith('.png') || sourceSrc.endsWith('.jpg') || sourceSrc.endsWith('.jpeg') || sourceSrc.endsWith('.webp')) {
        const img = this.getImageElement(sourceSrc);
        if (img.complete && img.naturalWidth > 0) {
          this.drawSourceWithFit(ctx, img, canvasW, canvasH, isTransparent);
        } else {
          this.drawFallbackCard(ctx, clip, canvasW, canvasH, scaleFactor);
        }
      } else {
        const video = this.getVideoElement(sourceSrc);
        const inPoint = clip.inPoint || 0;
        let relTime: number;

        if (clip.freezeFrame || (clip as any).isFreeze) {
          // Freeze frame: lock to fixed timestamp
          relTime = (clip as any).freezeTime ?? inPoint;
        } else if (clip.reverse) {
          // Reverse: play backwards from outPoint/end down to inPoint
          const elapsed = Math.max(0, (currentTime - clip.start) * (clip.speed || 1));
          const endPoint = clip.outPoint || (inPoint + clip.duration);
          relTime = Math.max(inPoint, endPoint - elapsed);
        } else if ((clip as any).speedCurve) {
          // Speed curve / ramping
          const progress = Math.min(1, Math.max(0, (currentTime - clip.start) / clip.duration));
          let curveProgress = progress;
          const curve = (clip as any).speedCurve;
          if (curve === 'ease-in') {
            curveProgress = Math.pow(progress, 2);
          } else if (curve === 'ease-out') {
            curveProgress = 1 - Math.pow(1 - progress, 2);
          } else if (curve === 'ease-in-out') {
            curveProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          }
          relTime = inPoint + curveProgress * clip.duration * (clip.speed || 1);
        } else {
          relTime = inPoint + Math.max(0, (currentTime - clip.start) * (clip.speed || 1));
        }

        if (Math.abs(video.currentTime - relTime) > 0.04) {
          video.currentTime = relTime;
        }
        if (video.readyState >= 2) {
          this.drawSourceWithFit(ctx, video, canvasW, canvasH, isTransparent);
        } else {
          this.drawFallbackCard(ctx, clip, canvasW, canvasH, scaleFactor);
        }
      }
    } else {
      this.drawFallbackCard(ctx, clip, canvasW, canvasH, scaleFactor);
    }

    // Badge "Tham chiếu – không xuất" on preview
    if (clip.refOnly || clip.isReferenceOnly) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      const badgeText = 'Tham chiếu – không xuất';
      ctx.font = `bold ${Math.max(10, Math.round(13 * scaleFactor))}px sans-serif`;
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 16 * scaleFactor;
      const badgeH = 22 * scaleFactor;
      const badgeX = (canvasW - badgeW) / 2;
      const badgeY = 16 * scaleFactor;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, canvasW / 2, badgeY + badgeH / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  // 3.5 VIDEO EFFECTS RENDERER (Canvas & Shader Layer)
  private renderVideoEffect(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    currentTime: number,
    w: number,
    h: number,
    scaleFactor: number
  ): void {
    const effType = (clip.effectType || clip.name || '').toLowerCase();
    const intensity = (clip.effectIntensity ?? 50) / 100;
    const speed = clip.effectSpeed ?? 1.0;

    ctx.save();

    // GHOST REFERENCE CHECK (Missing asset placeholder)
    if ((clip as any).ghostRef || (clip as any).isGhostPlaceholder) {
      const ghost = (clip as any).ghostRef || {
        originalId: (clip as any).dynamicEffectId || clip.name || clip.id,
        originalVersion: (clip as any).dynamicEffectVersion || '1.0.0',
        kind: 'effect',
        missing: true,
      };
      renderGhostPlaceholder(ctx, ghost, w, h, scaleFactor);
      ctx.restore();
      return;
    }

    // DYNAMIC EFFECT SPEC RENDERER (Declarative WebGL2 & Canvas)
    if ((clip as any).dynamicSpec) {
      renderDynamicEffect(
        ctx,
        (clip as any).dynamicSpec,
        currentTime,
        w,
        h,
        intensity,
        speed,
        scaleFactor,
        { uSeed: (clip as any).seed ?? 42.0 }
      );
      ctx.restore();
      return;
    }

    if (effType.includes('blur')) {
      // Soft dreamy blur overlay
      ctx.globalAlpha = Math.min(0.7, intensity * 0.8);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 0, w, h);
    } else if (effType.includes('glitch')) {
      // Horizontal digital glitch slices
      ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
      const sliceCount = Math.floor(6 + intensity * 10);
      for (let i = 0; i < sliceCount; i++) {
        const sy = (Math.sin(currentTime * 20 * speed + i * 1.5) * 0.5 + 0.5) * h;
        const sh = (Math.sin(currentTime * 10 + i) * 8 + 12) * scaleFactor;
        const dx = (Math.sin(currentTime * 45 + i * 3) * 25 * intensity) * scaleFactor;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.25)' : 'rgba(34, 211, 238, 0.25)';
        ctx.fillRect(dx, sy, w, sh);
      }
    } else if (effType.includes('vhs')) {
      // CRT Scanlines + Slight Color Shift
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < h; y += 4 * scaleFactor) {
        ctx.fillRect(0, y, w, 1.5 * scaleFactor);
      }
      // VHS tracking line
      const trackY = ((currentTime * 120 * speed) % h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, trackY, w, 14 * scaleFactor);
    } else if (effType.includes('rgb')) {
      // RGB Split simulation
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 0, 60, 0.15)';
      ctx.fillRect(intensity * 10 * scaleFactor, 0, w, h);
      ctx.fillStyle = 'rgba(0, 220, 255, 0.15)';
      ctx.fillRect(-intensity * 10 * scaleFactor, 0, w, h);
    } else if (effType.includes('pulse') || effType.includes('zoom')) {
      // Pulse zoom overlay border
      const pulse = Math.sin(currentTime * 8 * speed) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(31, 200, 219, ${pulse * 0.35 * intensity})`;
      ctx.lineWidth = 12 * scaleFactor;
      ctx.strokeRect(0, 0, w, h);
    } else if (effType.includes('flash')) {
      // Periodic strobe flash
      const flash = Math.pow(Math.sin(currentTime * 4 * speed), 8);
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * intensity * 0.65})`;
      ctx.fillRect(0, 0, w, h);
    } else if (effType.includes('vignette')) {
      // Dark cinematic vignette
      const radius = Math.max(w, h) / 1.4;
      const grad = ctx.createRadialGradient(w / 2, h / 2, radius * (1 - intensity * 0.7), w / 2, h / 2, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, intensity * 0.9)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (effType.includes('grain')) {
      // Film grain noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const grainCount = Math.floor(60 * intensity);
      for (let i = 0; i < grainCount; i++) {
        const gx = ((currentTime * 800 + i * 97) % w);
        const gy = ((currentTime * 600 + i * 131) % h);
        ctx.fillRect(gx, gy, 2 * scaleFactor, 2 * scaleFactor);
      }
    } else if (effType.includes('snow')) {
      // Falling snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 37 + Math.sin(currentTime + i) * 20) * scaleFactor) % w;
        const sy = ((currentTime * (40 + (i % 5) * 15) * speed + i * 45) * scaleFactor) % h;
        const size = (1.5 + (i % 3)) * scaleFactor;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (effType.includes('light') || effType.includes('leak')) {
      // Golden/Amber Light Leak sweep
      const leakGrad = ctx.createLinearGradient(0, 0, w, h);
      const shift = Math.sin(currentTime * 1.5 * speed) * 0.2;
      leakGrad.addColorStop(Math.max(0, 0.1 + shift), 'rgba(251, 146, 60, 0)');
      leakGrad.addColorStop(Math.min(1, 0.5 + shift), `rgba(251, 191, 36, ${0.35 * intensity})`);
      leakGrad.addColorStop(Math.min(1, 0.9 + shift), 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = leakGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (effType.includes('mirror')) {
      // Center split mirror marker
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
    } else if (effType.includes('pixelate')) {
      // Stylized mosaic grid overlay
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      const step = Math.max(8, Math.round(18 * scaleFactor * intensity));
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Apply Adjustment Layer Overlay (Vignette, Temperature, Tint, Exposure, Fade, Grain)
  private applyAdjustmentLayer(ctx: CanvasRenderingContext2D, clip: TimelineClip, w: number, h: number): void {
    const adj = clip.adjustments || {};
    const vignette = adj.vignette || 0;
    if (vignette > 0) {
      ctx.save();
      const radius = Math.max(w, h) / 1.5;
      const grad = ctx.createRadialGradient(w / 2, h / 2, radius * (1 - vignette / 100), w / 2, h / 2, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, (vignette / 100) * 0.85)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const temp = adj.temperature || 0;
    if (temp !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = temp > 0 ? 'color-burn' : 'color-dodge';
      ctx.globalAlpha = Math.min(0.25, Math.abs(temp) / 150);
      ctx.fillStyle = temp > 0 ? '#ff8800' : '#0099ff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const tint = adj.tint || 0;
    if (tint !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.2, Math.abs(tint) / 160);
      ctx.fillStyle = tint > 0 ? '#ff00aa' : '#00ff66';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const exposure = adj.exposure || 0;
    if (exposure !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = exposure > 0 ? 'screen' : 'multiply';
      ctx.globalAlpha = Math.min(0.3, Math.abs(exposure) / 150);
      ctx.fillStyle = exposure > 0 ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const fade = adj.fade || 0;
    if (fade > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.25, (fade / 100) * 0.35);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const grain = adj.grain || 0;
    if (grain > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const count = Math.floor(grain * 1.2);
      for (let i = 0; i < count; i++) {
        const gx = (Math.random() * w);
        const gy = (Math.random() * h);
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
      ctx.restore();
    }
  }

  // Apply Filter Track Overlay
  private applyFilterTrack(ctx: CanvasRenderingContext2D, clip: TimelineClip, w: number, h: number): void {
    const filterId = (clip.filter as any)?.id || clip.filter || clip.name;
    const intensity = (clip.filter as any)?.intensity ?? (clip as any).filterIntensity ?? 80;
    const preset = FILTER_PRESETS.find((f) => f.id === filterId || f.name === filterId);
    if (!preset || preset.id === 'none') return;

    ctx.save();
    ctx.globalAlpha = Math.min(0.6, (intensity / 100) * 0.45);
    ctx.fillStyle = preset.color;
    ctx.globalCompositeOperation = 'color';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Draw media with Blur Fill (e.g. 16:9 on 9:16 or 1:1) or clean fit
  private drawSourceWithFit(
    ctx: CanvasRenderingContext2D,
    source: HTMLImageElement | HTMLVideoElement,
    canvasW: number,
    canvasH: number,
    isTransparent: boolean = false
  ): void {
    const sw = (source as any).videoWidth || (source as any).naturalWidth || (source as any).width || 1280;
    const sh = (source as any).videoHeight || (source as any).naturalHeight || (source as any).height || 720;

    const sourceAspect = sw / sh;
    const canvasAspect = canvasW / canvasH;

    // Blur Fill for aspect-ratio mismatches (e.g. 16:9 on 9:16 or 1:1 square on 9:16)
    if (!isTransparent && Math.abs(sourceAspect - canvasAspect) > 0.05) {
      ctx.save();
      ctx.filter = 'blur(28px) brightness(0.6)';
      const bgScale = Math.max(canvasW / sw, canvasH / sh) * 1.15;
      const bgW = sw * bgScale;
      const bgH = sh * bgScale;
      ctx.drawImage(source, -bgW / 2, -bgH / 2, bgW, bgH);
      ctx.restore();

      const fitScale = Math.min(canvasW / sw, canvasH / sh);
      const fw = sw * fitScale;
      const fh = sh * fitScale;
      ctx.drawImage(source, -fw / 2, -fh / 2, fw, fh);
    } else {
      const fitScale = Math.min(canvasW / sw, canvasH / sh);
      const fw = sw * fitScale;
      const fh = sh * fitScale;
      ctx.drawImage(source, -fw / 2, -fh / 2, fw, fh);
    }
  }

  // Procedural 9:16 Video Canvas Card fallback
  private drawFallbackCard(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    canvasW: number,
    canvasH: number,
    scaleFactor: number
  ): void {
    const cardGrad = ctx.createLinearGradient(-canvasW / 2, -canvasH / 2, canvasW / 2, canvasH / 2);
    if (clip.filter === 'cyberpunk') {
      cardGrad.addColorStop(0, '#3b0764');
      cardGrad.addColorStop(1, '#083344');
    } else if (clip.filter === 'cinematic') {
      cardGrad.addColorStop(0, '#042f2e');
      cardGrad.addColorStop(1, '#0f172a');
    } else {
      cardGrad.addColorStop(0, '#0f172a');
      cardGrad.addColorStop(1, '#1e1b4b');
    }

    ctx.fillStyle = cardGrad;
    ctx.fillRect(-canvasW / 2 + 30 * scaleFactor, -canvasH / 2 + 80 * scaleFactor, canvasW - 60 * scaleFactor, canvasH - 160 * scaleFactor);

    ctx.beginPath();
    ctx.arc(0, 0, 75 * scaleFactor, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.fill();
    ctx.lineWidth = 3 * scaleFactor;
    ctx.strokeStyle = '#22D3EE';
    ctx.stroke();

    ctx.filter = 'none';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(22 * scaleFactor)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(clip.name || 'Clip', 0, 8 * scaleFactor);
  }

  // 3.4 STICKERS & VECTOR SHAPES RENDERER
  private renderStickerClip(
    ctx: CanvasRenderingContext2D,
    sticker: TimelineClip,
    currentTime: number,
    canvasW: number,
    canvasH: number,
    scaleFactor: number
  ): void {
    ctx.save();
    ctx.globalAlpha = sticker.opacity ?? 1;
    ctx.translate(canvasW / 2 + (sticker.x || 0) * scaleFactor, canvasH / 2 + (sticker.y || 0) * scaleFactor);
    if (sticker.rotation) ctx.rotate((sticker.rotation * Math.PI) / 180);
    const s = (sticker.scale || 1);
    ctx.scale(s, s);

    // 1. Shapes (Rect, Circle, Star, Heart, Triangle, Arrow, Frame, Divider)
    if (sticker.stickerShape) {
      const shape = sticker.stickerShape;
      const fill = sticker.stickerFill || '#1FC8DB';
      const stroke = sticker.stickerStroke || '#FFFFFF';
      const sz = 60 * scaleFactor;

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3 * scaleFactor;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (shape === 'rect') {
        ctx.roundRect(-sz, -sz / 2, sz * 2, sz, 8 * scaleFactor);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'circle') {
        ctx.arc(0, 0, sz * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'star') {
        const spikes = 5;
        const outer = sz;
        const inner = sz * 0.45;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(0, -outer);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
          rot += step;
          ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'heart') {
        const top = -sz * 0.4;
        ctx.moveTo(0, top + sz * 0.6);
        ctx.bezierCurveTo(-sz * 0.8, top, -sz * 0.8, top - sz * 0.6, 0, top - sz * 0.3);
        ctx.bezierCurveTo(sz * 0.8, top - sz * 0.6, sz * 0.8, top, 0, top + sz * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'triangle') {
        ctx.moveTo(0, -sz);
        ctx.lineTo(sz, sz * 0.8);
        ctx.lineTo(-sz, sz * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'arrow') {
        ctx.moveTo(-sz * 0.8, -sz * 0.25);
        ctx.lineTo(0, -sz * 0.25);
        ctx.lineTo(0, -sz * 0.6);
        ctx.lineTo(sz * 0.8, 0);
        ctx.lineTo(0, sz * 0.6);
        ctx.lineTo(0, sz * 0.25);
        ctx.lineTo(-sz * 0.8, sz * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'frame') {
        ctx.strokeRect(-sz * 1.5, -sz, sz * 3, sz * 2);
      } else if (shape === 'divider') {
        ctx.moveTo(-sz * 1.8, 0);
        ctx.lineTo(sz * 1.8, 0);
        ctx.stroke();
      }
    } else if (sticker.src) {
      // 2. Image / SVG / GIF Sticker
      const img = this.getImageElement(sticker.src);
      if (img.complete && img.naturalWidth > 0) {
        const sw = 100 * scaleFactor;
        const sh = (img.naturalHeight / img.naturalWidth) * sw;
        ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
      }
    } else {
      // 3. Emoji Sticker
      ctx.font = `${Math.round(64 * scaleFactor)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.text || '🔥', 0, 0);
    }

    ctx.restore();
  }

  // 3.3 TEXT & TYPOGRAPHY RENDERER (20+ Presets, Fonts, Animations)
  private renderTextClip(
    ctx: CanvasRenderingContext2D,
    tClip: TimelineClip,
    currentTime: number,
    canvasW: number,
    canvasH: number,
    scaleFactor: number
  ): void {
    if (!tClip.text) return;
    ctx.save();

    const timeInClip = currentTime - tClip.start;
    const timeLeftInClip = tClip.start + tClip.duration - currentTime;

    // Animation In
    let inScale = 1;
    let inYOffset = 0;
    let inAlpha = 1;
    let displayText = tClip.text;

    if (tClip.textAnimIn === 'pop') {
      inScale = Math.min(1, timeInClip * 6);
    } else if (tClip.textAnimIn === 'slideUp') {
      inYOffset = Math.max(0, (0.35 - timeInClip) * 120 * scaleFactor);
    } else if (tClip.textAnimIn === 'fadeIn') {
      inAlpha = Math.min(1, timeInClip / 0.35);
    } else if (tClip.textAnimIn === 'typewriter') {
      const charCount = Math.floor(timeInClip * 20);
      displayText = tClip.text.slice(0, charCount);
    } else if (tClip.textAnimIn === 'zoomIn') {
      inScale = Math.min(1, 0.4 + timeInClip * 2);
    }

    // Animation Out
    let outAlpha = 1;
    let outYOffset = 0;
    if (tClip.textAnimOut === 'fade' && timeLeftInClip < 0.35) {
      outAlpha = Math.max(0, timeLeftInClip / 0.35);
    } else if (tClip.textAnimOut === 'slideDown' && timeLeftInClip < 0.35) {
      outYOffset = (0.35 - timeLeftInClip) * 80 * scaleFactor;
    }

    ctx.globalAlpha = (tClip.opacity ?? 1) * inAlpha * outAlpha;
    ctx.translate(
      canvasW / 2 + (tClip.x || 0) * scaleFactor,
      canvasH / 2 + (tClip.y || -110) * scaleFactor + inYOffset + outYOffset
    );
    if (tClip.rotation) ctx.rotate((tClip.rotation * Math.PI) / 180);
    ctx.scale((tClip.scale || 1) * inScale, (tClip.scale || 1) * inScale);

    // Font family & size
    const fontSize = Math.round((tClip.fontSize || 28) * scaleFactor);
    const fontFamily = tClip.fontFamily || 'Inter, sans-serif';
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const preset = tClip.textPreset || 'hormozi';

    // 1. Background Banner / Box
    if (tClip.textBg || preset === 'white_box' || preset === 'black_box' || preset === 'subtitle_sub') {
      const textMetrics = ctx.measureText(displayText);
      const textWidth = textMetrics.width;
      const padX = (tClip.textBg?.padding || 18) * scaleFactor;
      const padY = (tClip.textBg?.padding || 10) * scaleFactor;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize * 1.5 + padY * 2;
      const radius = (tClip.textBg?.radius || 8) * scaleFactor;

      ctx.fillStyle = tClip.textBg?.color || (preset === 'white_box' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.78)');
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, radius);
      ctx.fill();
    }

    // 2. Text Stroke & Shadow Styles based on Presets
    ctx.lineJoin = 'round';

    if (preset === 'neon_cyan') {
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 24 * scaleFactor;
      ctx.strokeStyle = '#0891B2';
      ctx.lineWidth = 4 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'neon_pink') {
      ctx.shadowColor = '#EC4899';
      ctx.shadowBlur = 25 * scaleFactor;
      ctx.strokeStyle = '#BE185D';
      ctx.lineWidth = 4 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#FDF2F8';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'red_alert') {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8 * scaleFactor;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#EF4444';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'gold_3d') {
      ctx.shadowColor = '#78350F';
      ctx.shadowOffsetX = 3 * scaleFactor;
      ctx.shadowOffsetY = 4 * scaleFactor;
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 5 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'gradient_sunset') {
      const grad = ctx.createLinearGradient(-100, 0, 100, 0);
      grad.addColorStop(0, '#FB923C');
      grad.addColorStop(1, '#F43F5E');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = grad;
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'synthwave_80s') {
      ctx.shadowColor = '#06B6D4';
      ctx.shadowOffsetX = -4 * scaleFactor;
      ctx.shadowOffsetY = 4 * scaleFactor;
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'comic_pop') {
      ctx.shadowColor = '#000000';
      ctx.shadowOffsetX = 5 * scaleFactor;
      ctx.shadowOffsetY = 5 * scaleFactor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'white_box') {
      ctx.fillStyle = '#0F172A';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'clean_minimal') {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6 * scaleFactor;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'matrix_green') {
      ctx.shadowColor = '#22C55E';
      ctx.shadowBlur = 18 * scaleFactor;
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 4 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#4ADE80';
      ctx.fillText(displayText, 0, 0);
    } else if (preset === 'fire_orange') {
      ctx.shadowColor = '#EA580C';
      ctx.shadowBlur = 16 * scaleFactor;
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = '#FB923C';
      ctx.fillText(displayText, 0, 0);
    } else {
      // Alex Hormozi Default Style
      ctx.strokeStyle = tClip.textStroke?.color || '#000000';
      ctx.lineWidth = (tClip.textStroke?.width || 6) * scaleFactor;
      ctx.strokeText(displayText, 0, 0);
      ctx.fillStyle = tClip.textColor || (tClip.name?.includes('Red') ? '#fda4af' : '#facc15');
      ctx.fillText(displayText, 0, 0);
    }

    ctx.restore();
  }

  // Render floating particle sparks & confetti
  private renderParticles(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    currentTime: number,
    canvasW: number,
    canvasH: number,
    scaleFactor: number
  ): void {
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const px = ((currentTime * 110 + i * 42) * scaleFactor) % canvasW;
      const py = canvasH - (((currentTime * 190 + i * 58) * scaleFactor) % canvasH);
      ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#EC4899';
      ctx.beginPath();
      ctx.arc(px, py, (2.5 + (i % 3)) * scaleFactor, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Render TikTok & Reels Safe Zone overlay
  private renderSafeZone(ctx: CanvasRenderingContext2D, width: number, height: number, scaleFactor: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    const m = 18 * scaleFactor;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    // Safe zone guides text
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(14, 19, 32, 0.75)';
    ctx.fillRect(m + 8, m + 8, 140 * scaleFactor, 22 * scaleFactor);
    ctx.fillStyle = '#22D3EE';
    ctx.font = `bold ${Math.round(10 * scaleFactor)}px monospace`;
    ctx.fillText('Safe: Header', m + 14, m + 22 * scaleFactor);

    ctx.restore();
  }
}

export const sharedCompositor = new FrameCompositor();
