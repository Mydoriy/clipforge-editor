import type { TimelineClip } from '../store/useEditorStore';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
}

export async function exportTimelineVideo(
  clips: TimelineClip[],
  duration: number,
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  const width = 540;
  const height = 960;
  const fps = 30;
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

  // Supported mime types
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5000000 // 5 Mbps
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
        onProgress({ progress: progressPercent, status: `Đang render frame ${frame}/${totalFrames} (${progressPercent}%)` });
      }

      // Draw background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render clips at current time
      const activeClips = clips.filter((c) => time >= c.start && time <= c.start + c.duration);

      for (const clip of activeClips) {
        if (clip.track === 'video') {
          // Render dynamic visual pattern
          ctx.save();
          ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
          ctx.fillRect(40, 200, width - 80, height - 400);

          // Animated waveform or center circle
          const pulse = Math.sin(time * 4) * 20;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 80 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#00f2fe';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('CLIPFORGE 9:16 STUDIO', width / 2, height / 2 + 8);
          ctx.restore();
        }

        if (clip.track === 'text' && clip.text) {
          ctx.save();
          const clipTime = time - clip.start;
          const pop = Math.min(1, clipTime * 4); // pop in animation
          ctx.translate(width / 2 + (clip.x || 0), height / 2 + (clip.y || -140));
          ctx.scale((clip.scale || 1) * pop, (clip.scale || 1) * pop);

          ctx.fillStyle = '#facc15';
          ctx.font = '900 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 4;
          ctx.fillText(clip.text, 0, 0);
          ctx.restore();
        }

        if (clip.particleType) {
          // Render floating particle sparks
          ctx.save();
          for (let i = 0; i < 20; i++) {
            const px = ((time * 120 + i * 45) % width);
            const py = (height - ((time * 200 + i * 65) % height));
            ctx.fillStyle = i % 2 === 0 ? '#00f2fe' : '#ec4899';
            ctx.beginPath();
            ctx.arc(px, py, 3 + (i % 4), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      frame++;
      setTimeout(renderNextFrame, interval / 2); // faster than real time
    }

    renderNextFrame();
  });
}

