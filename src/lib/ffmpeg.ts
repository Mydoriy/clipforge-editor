import { ffmpegService } from '../utils/ffmpeg';

export { ffmpegService };

// Verify browser SharedArrayBuffer & WebAssembly support for FFmpeg.wasm
export function isFFmpegSupported(): boolean {
  try {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  } catch (e) {
    return false;
  }
}

export async function trimVideoClip(file: Blob, start: number, duration: number): Promise<Blob> {
  return ffmpegService.trimVideo(file, start, duration);
}

export async function changeVideoSpeed(file: Blob, speed: number): Promise<Blob> {
  return ffmpegService.changeSpeed(file, speed);
}

export async function convertVideoToGif(file: Blob, fps?: number, width?: number): Promise<Blob> {
  return ffmpegService.convertToGif(file, fps, width);
}

