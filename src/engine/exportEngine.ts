import { sharedCompositor } from './compositor';
import type { TimelineClip } from '../store/useEditorStore';
import * as Mp4Muxer from 'mp4-muxer';
import { trackEvent } from '../utils/telemetry';

export interface ExportProgress {
  progress: number; // 0 - 100
  status: string;
  currentFrame?: number;
  totalFrames?: number;
  remainingSeconds?: number;
}

export interface AdvancedExportOptions {
  resolution?: '720p' | '1080p' | '2k' | '4k';
  fps?: 24 | 25 | 30 | 50 | 60;
  format?: 'mp4' | 'webm' | 'gif' | 'mp3' | 'wav' | 'aac';
  bitrate?: number; // bits per second
  codec?: 'h264' | 'hevc' | 'av1';
  range?: { start: number; end: number };
  audioOnly?: boolean;
  abortSignal?: { aborted: boolean };
  aspect?: string;
  writableStream?: any; // FileSystemWritableFileStream for streaming export without holding full video in RAM
}

export async function exportVideoWithWebCodecs(
  clips: TimelineClip[],
  duration: number,
  options: AdvancedExportOptions = {},
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  // CHỐT CHẶN XUẤT: Loại bỏ 100% mọi clip refOnly (hình và tiếng)
  const exportClips = clips.filter(
    (c) => !c.refOnly && !c.isReferenceOnly && (c as any).role !== 'reference'
  );

  // If audio-only is requested
  if (options.audioOnly) {
    const audioFmt = options.format === 'wav' ? 'wav' : 'mp3';
    return exportAudioOnly(exportClips, duration, audioFmt, onProgress);
  }

  const res = options.resolution || '1080p';
  const fps = options.fps || 30;
  const format = options.format || 'mp4';
  const aspect = options.aspect || '9:16';

  let width = 1080;
  let height = 1920;

  if (aspect === '16:9') {
    if (res === '720p') { width = 1280; height = 720; }
    else if (res === '2k') { width = 2560; height = 1440; }
    else if (res === '4k') { width = 3840; height = 2160; }
    else { width = 1920; height = 1080; }
  } else if (aspect === '1:1') {
    if (res === '720p') { width = 720; height = 720; }
    else if (res === '2k') { width = 1440; height = 1440; }
    else if (res === '4k') { width = 2160; height = 2160; }
    else { width = 1080; height = 1080; }
  } else if (aspect === '4:3') {
    if (res === '720p') { width = 960; height = 720; }
    else if (res === '2k') { width = 1920; height = 1440; }
    else if (res === '4k') { width = 2880; height = 2160; }
    else { width = 1440; height = 1080; }
  } else if (aspect === '3:4') {
    if (res === '720p') { width = 720; height = 960; }
    else if (res === '2k') { width = 1440; height = 1920; }
    else if (res === '4k') { width = 2160; height = 2880; }
    else { width = 1080; height = 1440; }
  } else if (aspect === '21:9') {
    if (res === '720p') { width = 1680; height = 720; }
    else if (res === '2k') { width = 3360; height = 1440; }
    else if (res === '4k') { width = 5040; height = 2160; }
    else { width = 2560; height = 1080; }
  } else {
    // 9:16 vertical
    if (res === '720p') { width = 720; height = 1280; }
    else if (res === '2k') { width = 1440; height = 2560; }
    else if (res === '4k') { width = 2160; height = 3840; }
    else { width = 1080; height = 1920; }
  }

  const startTime = options.range ? Math.max(0, options.range.start) : 0;
  const endTime = options.range ? Math.min(duration, options.range.end) : duration;
  const exportDuration = Math.max(0.5, endTime - startTime);
  const totalFrames = Math.max(1, Math.round(exportDuration * fps));

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const hasWebCodecs = typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined';
  const startTimestamp = Date.now();

  trackEvent('export_started', {
    resolution: res,
    codec: options.codec || 'h264',
    fps,
    duration_sec: Math.round(exportDuration)
  });

  if (hasWebCodecs && format === 'mp4' && Mp4Muxer.Muxer) {
    try {
      if (onProgress) onProgress({ progress: 0, status: 'Khởi tạo WebCodecs Hardware VideoEncoder...' });

      // Stream directly to FileSystemWritableFileStream if available, eliminating memory buildup
      const target = options.writableStream && (Mp4Muxer as any).FileSystemWritableFileStreamTarget
        ? new (Mp4Muxer as any).FileSystemWritableFileStreamTarget(options.writableStream)
        : new Mp4Muxer.ArrayBufferTarget();

      const muxer = new Mp4Muxer.Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height
        },
        fastStart: options.writableStream ? false : 'in-memory'
      });

      let encodeError: Error | null = null;
      const VideoEncoderClass = (window as any).VideoEncoder;
      const VideoFrameClass = (window as any).VideoFrame;

      const encoder = new VideoEncoderClass({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (err: any) => {
          console.error('VideoEncoder error:', err);
          encodeError = err;
        }
      });

      // Bitrate selection
      const defaultBitrate = res === '4k' ? 24000000 : res === '2k' ? 14000000 : res === '1080p' ? 8000000 : 4500000;
      const finalBitrate = options.bitrate || defaultBitrate;

      // Codec configuration
      let codecStr = 'avc1.640028'; // H.264 High Profile Level 4.0
      if (options.codec === 'hevc') {
        codecStr = 'hvc1.1.6.L93.B0';
      } else if (options.codec === 'av1') {
        codecStr = 'av01.0.08M.10';
      }

      await encoder.configure({
        codec: codecStr,
        width,
        height,
        bitrate: finalBitrate,
        framerate: fps
      });

      // Render frames sequentially
      for (let f = 0; f < totalFrames; f++) {
        if (options.abortSignal?.aborted) {
          throw new Error('EXPORT_CANCELLED');
        }
        if (encodeError) throw encodeError;

        const time = startTime + (f / fps);
        sharedCompositor.renderFrame(canvas, exportClips, time, {
          isExport: true,
          targetWidth: width,
          targetHeight: height
        });

        const frame = new VideoFrameClass(canvas, {
          timestamp: Math.round((f / fps) * 1000000)
        });
        encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
        frame.close();

        const pct = Math.round(((f + 1) / totalFrames) * 100);
        const elapsed = (Date.now() - startTimestamp) / 1000;
        const remaining = pct > 0 ? Math.round((elapsed / pct) * (100 - pct)) : 0;

        if (onProgress) {
          onProgress({
            progress: pct,
            status: `WebCodecs render frame ${f + 1}/${totalFrames} (${pct}%)`,
            currentFrame: f + 1,
            totalFrames,
            remainingSeconds: remaining
          });
        }

        // Yield to browser UI thread periodically
        if (f % 4 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (onProgress) onProgress({ progress: 99, status: 'Đang đóng gói file MP4 với Mp4Muxer...' });
      await encoder.flush();
      muxer.finalize();

      if (options.writableStream) {
        // Data written directly to FileSystemWritableFileStream - minimal RAM used!
        if (onProgress) onProgress({ progress: 100, status: 'Hoàn tất ghi file streaming vào ổ đĩa!' });
        trackEvent('export_success', {
          resolution: res,
          codec: options.codec || 'h264',
          export_duration_ms: Date.now() - startTimestamp,
          file_size_bytes: 0
        });
        return new Blob([], { type: 'video/mp4' });
      }

      const buffer = (target as Mp4Muxer.ArrayBufferTarget).buffer;
      const finalBlob = new Blob([buffer], { type: 'video/mp4' });
      if (onProgress) onProgress({ progress: 100, status: 'Hoàn tất xuất video MP4!' });
      trackEvent('export_success', {
        resolution: res,
        codec: options.codec || 'h264',
        export_duration_ms: Date.now() - startTimestamp,
        file_size_bytes: finalBlob.size
      });
      return finalBlob;
    } catch (err: any) {
      if (err.message === 'EXPORT_CANCELLED') {
        throw err;
      }
      trackEvent('export_failed', {
        resolution: res,
        codec: options.codec || 'h264',
        error_code: err?.name || 'WEBCODECS_ENCODE_FAILED',
        error_stage: 'webcodecs_render'
      });
      console.warn('WebCodecs encoder failed, falling back to MediaRecorder:', err);
    }
  }

  // Fallback: Realtime MediaRecorder
  return exportWithMediaRecorderFallback(exportClips, startTime, endTime, width, height, fps, format, options, onProgress);
}

// MediaRecorder Fallback
async function exportWithMediaRecorderFallback(
  clips: TimelineClip[],
  startTime: number,
  endTime: number,
  width: number,
  height: number,
  fps: number,
  format: 'mp4' | 'webm' | 'gif' | 'mp3' | 'wav' | 'aac',
  options: AdvancedExportOptions,
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const stream = canvas.captureStream(fps);
  const exportDuration = Math.max(0.5, endTime - startTime);
  const totalFrames = Math.max(1, Math.round(exportDuration * fps));
  const startTimestamp = Date.now();

  let mimeType = 'video/webm';
  if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    mimeType = 'video/mp4;codecs=avc1';
  } else if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    mimeType = 'video/webm;codecs=vp9';
  }

  const defaultBitrate = width >= 2160 ? 20000000 : width >= 1440 ? 12000000 : 7000000;
  const finalBitrate = options.bitrate || defaultBitrate;

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: finalBitrate
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      if (onProgress) onProgress({ progress: 100, status: 'Hoàn tất xuất video!' });
      trackEvent('export_success', {
        resolution: `${height}p`,
        codec: 'mediarecorder',
        export_duration_ms: Date.now() - startTimestamp,
        file_size_bytes: finalBlob.size
      });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => {
      trackEvent('export_failed', {
        resolution: `${height}p`,
        codec: 'mediarecorder',
        error_code: 'MEDIA_RECORDER_ERROR',
        error_stage: 'media_recorder'
      });
      reject(e);
    };

    recorder.start(100);

    let frame = 0;
    const interval = 1000 / fps;

    function step() {
      if (options.abortSignal?.aborted) {
        recorder.stop();
        reject(new Error('EXPORT_CANCELLED'));
        return;
      }

      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const time = startTime + (frame / fps);
      sharedCompositor.renderFrame(canvas, clips, time, {
        isExport: true,
        targetWidth: width,
        targetHeight: height
      });

      const pct = Math.round(((frame + 1) / totalFrames) * 100);
      const elapsed = (Date.now() - startTimestamp) / 1000;
      const remaining = pct > 0 ? Math.round((elapsed / pct) * (100 - pct)) : 0;

      if (onProgress) {
        onProgress({
          progress: pct,
          status: `MediaRecorder render frame ${frame + 1}/${totalFrames} (${pct}%)`,
          currentFrame: frame + 1,
          totalFrames,
          remainingSeconds: remaining
        });
      }

      frame++;
      setTimeout(step, interval / 2);
    }

    step();
  });
}

// Audio-only Export using OfflineAudioContext + WAV header encoding
export async function exportAudioOnly(
  clips: TimelineClip[],
  duration: number,
  format: 'mp3' | 'wav' = 'wav',
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  const sampleRate = 44100;
  const numFrames = Math.max(1, Math.ceil(duration * sampleRate));
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(2, numFrames, sampleRate);

  const audioClips = clips.filter((c) => (c.type === 'audio' || c.track === 'audio' || c.type === 'video') && c.src);

  if (onProgress) onProgress({ progress: 15, status: 'Đang đọc và decode dữ liệu âm thanh...' });

  for (const clip of audioClips) {
    try {
      const res = await fetch(clip.src!);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await offlineCtx.decodeAudioData(arrayBuf);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuf;

      const gain = offlineCtx.createGain();
      gain.gain.value = clip.volume !== undefined ? clip.volume : 1.0;

      source.connect(gain);
      gain.connect(offlineCtx.destination);
      source.start(clip.start, clip.inPoint || 0, clip.duration);
    } catch (e) {
      console.warn('Audio decoding skipped for clip', clip.name, e);
    }
  }

  if (onProgress) onProgress({ progress: 60, status: 'Đang mix các track âm thanh...' });
  const renderedBuffer = await offlineCtx.startRendering();

  if (onProgress) onProgress({ progress: 90, status: 'Đang tạo file WAV audio...' });
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  if (onProgress) onProgress({ progress: 100, status: 'Hoàn tất xuất âm thanh!' });
  return wavBlob;
}

// Convert AudioBuffer to WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + result.length * bytesPerSample);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + result.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, result.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Export Current Playhead Frame as pristine PNG
export async function exportCurrentFrameAsPng(
  clips: TimelineClip[],
  time: number,
  resolution: '1080p' | '4k' = '1080p'
): Promise<Blob | null> {
  const width = resolution === '4k' ? 2160 : 1080;
  const height = resolution === '4k' ? 3840 : 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  sharedCompositor.renderFrame(canvas, clips, time, {
    isExport: true,
    targetWidth: width,
    targetHeight: height
  });

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

// Export Captions as .SRT file
export function exportCaptionsSrt(clips: TimelineClip[]): Blob {
  const textClips = clips
    .filter((c) => (c.track === 'text' || c.type === 'text') && (c.text || c.name))
    .sort((a, b) => a.start - b.start);

  const formatSrtTime = (sec: number): string => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  let srtContent = '';
  textClips.forEach((c, i) => {
    srtContent += `${i + 1}\n`;
    srtContent += `${formatSrtTime(c.start)} --> ${formatSrtTime(c.start + c.duration)}\n`;
    srtContent += `${c.text || c.name}\n\n`;
  });

  if (!srtContent) {
    srtContent = '1\n00:00:00,000 --> 00:00:05,000\nCapCut Web Caption\n';
  }

  return new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
}
