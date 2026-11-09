import {
  exportVideoWithWebCodecs,
  exportAudioOnly,
  exportCurrentFrameAsPng,
  exportCaptionsSrt,
  type AdvancedExportOptions,
  type ExportProgress
} from '../engine/exportEngine';
import type { TimelineClip } from '../store/useEditorStore';

export type { ExportProgress };
export { exportAudioOnly, exportCurrentFrameAsPng, exportCaptionsSrt };

export interface ExportOptions extends AdvancedExportOptions {}

export async function exportTimelineVideo(
  clips: TimelineClip[],
  duration: number,
  options: ExportOptions = {},
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  return exportVideoWithWebCodecs(clips, duration, options, onProgress);
}

export async function exportTimelineAudio(
  clips: TimelineClip[],
  duration: number,
  format: 'mp3' | 'wav' = 'wav',
  onProgress?: (p: ExportProgress) => void,
  bitrateKbps: number = 192
): Promise<Blob> {
  return exportAudioOnly(clips, duration, format, onProgress, bitrateKbps);
}
