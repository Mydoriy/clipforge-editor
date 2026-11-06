import type { TimelineClip } from '../store/useEditorStore';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
}

export interface ExportOptions {
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  format?: 'mp4' | 'webm';
}

export async function exportTimelineVideo(
  clips: TimelineClip[],
  duration: number,
  options: ExportOptions = {},
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  const res = options.resolution || '1080p';
  const fps = options.fps || 30;
  const format = options.format || 'mp4';

  let width = 1080;
  let height = 1920;
  if (res === '720p') {
    width = 720;
    height = 1280;
  } else if (res === '4k') {
    width = 2160;
    height = 3840;
  }

  const totalFrames = Math.max(1, Math.round(duration * fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Cannot get 2d context for video rendering');

  const stream = canvas.captureStream(fps);

  // Setup Web Audio recording if possible
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  try {
    audioCtx = new AudioCtx();
    dest = audioCtx.createMediaStreamDestination();
    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch (e) {
    console.warn('Audio export not supported in this context', e);
  }

  // Desired mime type based on format
  let mimeType = 'video/webm';
  if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    mimeType = 'video/mp4;codecs=avc1';
  } else if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    mimeType = 'video/webm;codecs=vp9';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: res === '4k' ? 12000000 : res === '1080p' ? 6000000 : 3500000
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      if (audioCtx) audioCtx.close();
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start(100);

    let frame = 0;
    const interval = 1000 / fps;

    function renderNextFrame() {
      if (frame >= totalFrames) {
        recorder.stop();
        if (onProgress) onProgress({ progress: 100, status: 'Hoàn tất xuất video!' });
        return;
      }

      const time = frame / fps;
      const progressPercent = Math.round((frame / totalFrames) * 100);
      if (onProgress) {
        onProgress({
          progress: progressPercent,
          status: `Đang render frame ${frame}/${totalFrames} (${progressPercent}%)`
        });
      }

      // Draw background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0a0d14');
      grad.addColorStop(0.5, '#0e1422');
      grad.addColorStop(1, '#05070a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render clips at current time
      const activeClips = clips.filter((c) => time >= c.start && time <= c.start + c.duration);

      // Render video/image
      for (const clip of activeClips) {
        if (clip.track === 'video' || clip.type === 'image') {
          ctx.save();
          ctx.globalAlpha = clip.opacity ?? 1;

          // Scale coordinates for target resolution
          const scaleFactor = width / 540;
          ctx.translate(width / 2 + (clip.x || 0) * scaleFactor, height / 2 + (clip.y || 0) * scaleFactor);
          if (clip.rotation) ctx.rotate((clip.rotation * Math.PI) / 180);
          ctx.scale(clip.scale || 1, clip.scale || 1);

          // Filter
          const b = 100 + (clip.brightness || 0);
          const c = 100 + (clip.contrast || 0);
          const s = 100 + (clip.saturation || 0);
          let filterCss = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
          if (clip.filter === 'noir') filterCss += ' grayscale(100%)';
          else if (clip.filter === 'vintage') filterCss += ' sepia(60%)';
          else if (clip.filter === 'warm') filterCss += ' sepia(25%) saturate(140%)';
          else if (clip.filter === 'cinematic') filterCss += ' contrast(115%) saturate(125%)';
          ctx.filter = filterCss;

          // Dynamic Card
          const cardGrad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
          cardGrad.addColorStop(0, '#0f172a');
          cardGrad.addColorStop(1, '#1e1b4b');
          ctx.fillStyle = cardGrad;
          ctx.fillRect(-width / 2 + 60, -height / 2 + 160, width - 120, height - 320);

          const pulse = Math.sin(time * 4) * 20;
          ctx.beginPath();
          ctx.arc(0, 0, 140 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
          ctx.fill();
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#22D3EE';
          ctx.stroke();

          ctx.filter = 'none';
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(40 * scaleFactor)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(clip.name, 0, 15);
          ctx.restore();
        }

        // Render stickers
        if (clip.track === 'sticker') {
          ctx.save();
          const scaleFactor = width / 540;
          ctx.translate(width / 2 + (clip.x || 0) * scaleFactor, height / 2 + (clip.y || 0) * scaleFactor);
          if (clip.rotation) ctx.rotate((clip.rotation * Math.PI) / 180);
          ctx.scale(clip.scale || 1, clip.scale || 1);
          ctx.font = `${Math.round(110 * scaleFactor)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(clip.text || '🔥', 0, 0);
          ctx.restore();
        }

        // Render text
        if (clip.track === 'text' && clip.text) {
          ctx.save();
          const scaleFactor = width / 540;
          const timeInClip = time - clip.start;
          const pop = Math.min(1, timeInClip * 6);
          ctx.translate(
            width / 2 + (clip.x || 0) * scaleFactor,
            height / 2 + (clip.y || -110) * scaleFactor
          );
          ctx.scale((clip.scale || 1) * pop, (clip.scale || 1) * pop);

          ctx.font = `900 ${Math.round(52 * scaleFactor)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 10 * scaleFactor;
          ctx.lineJoin = 'round';
          ctx.strokeText(clip.text, 0, 0);

          ctx.fillStyle = '#facc15';
          ctx.fillText(clip.text, 0, 0);
          ctx.restore();
        }

        // Render particles
        if (clip.particleType) {
          ctx.save();
          for (let i = 0; i < 28; i++) {
            const px = (time * 200 + i * 80) % width;
            const py = height - ((time * 360 + i * 110) % height);
            ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#EC4899';
            ctx.beginPath();
            ctx.arc(px, py, 5 + (i % 4), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      frame++;
      setTimeout(renderNextFrame, interval / 2);
    }

    renderNextFrame();
  });
}
