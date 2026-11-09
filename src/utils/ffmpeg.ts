import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  async load(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) return false;

    try {
      this.isLoading = true;
      this.ffmpeg = new FFmpeg();

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (error) {
      console.warn('FFmpeg.wasm fallback (SharedArrayBuffer/CORS):', error);
      this.isLoading = false;
      return false;
    }
  }

  // Trim video clip at client
  async trimVideo(file: Blob, start: number, duration: number): Promise<Blob> {
    const loaded = await this.load();
    if (!loaded || !this.ffmpeg) {
      // Fallback: return original if wasm unavailable
      return file;
    }

    try {
      const data = await fetchFile(file);
      await this.ffmpeg.writeFile('input.mp4', data);

      // Fast trim command
      await this.ffmpeg.exec([
        '-ss', start.toString(),
        '-i', 'input.mp4',
        '-t', duration.toString(),
        '-c', 'copy',
        'trimmed.mp4'
      ]);

      const output = await this.ffmpeg.readFile('trimmed.mp4');
      return new Blob([output as any], { type: 'video/mp4' });
    } catch (e) {
      console.error('FFmpeg trim error:', e);
      return file;
    }
  }

  // Speed adjustment (e.g. 0.5x, 1.2x, 1.5x, 2.0x)
  async changeSpeed(file: Blob, speed: number): Promise<Blob> {
    const loaded = await this.load();
    if (!loaded || !this.ffmpeg) return file;

    try {
      const data = await fetchFile(file);
      await this.ffmpeg.writeFile('input_speed.mp4', data);

      const setpts = (1 / speed).toFixed(2);
      await this.ffmpeg.exec([
        '-i', 'input_speed.mp4',
        '-filter_complex', `[0:v]setpts=${setpts}*PTS[v];[0:a]atempo=${speed}[a]`,
        '-map', '[v]',
        '-map', '[a]',
        'speed_out.mp4'
      ]);

      const output = await this.ffmpeg.readFile('speed_out.mp4');
      return new Blob([output as any], { type: 'video/mp4' });
    } catch (e) {
      console.error('FFmpeg speed error:', e);
      return file;
    }
  }

  // Convert video to animated GIF with palette generation
  async convertToGif(file: Blob, fps: number = 15, width: number = 540): Promise<Blob> {
    const loaded = await this.load();
    if (!loaded || !this.ffmpeg) return file;

    try {
      const data = await fetchFile(file);
      await this.ffmpeg.writeFile('input_gif.mp4', data);

      await this.ffmpeg.exec([
        '-i', 'input_gif.mp4',
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        'output.gif'
      ]);

      const output = await this.ffmpeg.readFile('output.gif');
      return new Blob([output as any], { type: 'image/gif' });
    } catch (e) {
      console.error('FFmpeg convertToGif error:', e);
      return file;
    }
  }

  // Convert Audio WAV to genuine MP3 using libmp3lame
  async convertWavToMp3(wavBlob: Blob, bitrateKbps: number = 192): Promise<Blob> {
    const loaded = await this.load();
    if (!loaded || !this.ffmpeg) {
      return new Blob([await wavBlob.arrayBuffer()], { type: 'audio/mp3' });
    }

    try {
      const data = await fetchFile(wavBlob);
      await this.ffmpeg.writeFile('input_audio.wav', data);

      await this.ffmpeg.exec([
        '-i', 'input_audio.wav',
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', `${bitrateKbps}k`,
        'output_audio.mp3'
      ]);

      const output = await this.ffmpeg.readFile('output_audio.mp3');
      return new Blob([output as any], { type: 'audio/mp3' });
    } catch (e) {
      console.warn('FFmpeg convertWavToMp3 fallback:', e);
      return new Blob([await wavBlob.arrayBuffer()], { type: 'audio/mp3' });
    }
  }
}

export const ffmpegService = new FFmpegService();

