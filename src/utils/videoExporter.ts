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
