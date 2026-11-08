/**
 * T3. PHÒNG REMIX - Kiểu Dữ Liệu & Hợp Đồng (Remix Room Types & Contracts)
 * ============================================================================
 * Model definitions for:
 * 1. ReferenceTimeline (read-only reference layer)
 * 2. RemixSlot (individual scene slot with refOnly media & user assigned clip)
 * 3. Technique Controls (toggle, sliders, replacement via Resolver, overlays)
 * 4. Export Preflight Check (blocking export of reference content)
 * 5. Project Integration & Memory Revocation
 * ============================================================================
 */

import { z } from 'zod';
import type { TimelineClip } from '../store/useEditorStore.ts';

export type SlotRole = 'intro' | 'action' | 'b-roll' | 'climax' | 'outro' | 'transition';
export type SlotStatus = 'empty' | 'filled' | 'placeholder_black' | 'excluded';
export type FitMode = 'trim' | 'speed';
export type ScaleMode = 'fit' | 'fill' | 'reframe';
export type ComparisonMode = 'side_by_side' | 'split_screen' | 'toggle_before_after' | 'remix_only';

export interface SlotTechnique {
  id: string;
  techniqueId: string;
  name: { vi: string; en: string };
  category: 'transition' | 'effect' | 'look' | 'text' | 'beat';
  enabled: boolean;
  params: Record<string, any>;
  source: 'learned' | 'registry' | 'custom';
  verifiedScore?: number;
}

export interface SlotTextTechnique {
  id: string;
  text: string;
  enabled: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  style?: Record<string, any>;
}

export interface SlotBeatTechnique {
  enabled: boolean;
  syncToBeat: boolean;
  bpm?: number;
  beatIntervalSec?: number;
}

export interface ReferenceMediaSlotDescriptor {
  mediaId: string;
  thumbnailUrl?: string;
  dataUrl?: string;
  refOnly: true; // BẮT BUỘC: đánh dấu chỉ dùng tham chiếu, cấm xuất
  isMuted: boolean; // Mặc định tắt tiếng
  opacity: number; // Mặc định hiển thị mờ (0.35)
  label: 'Tham chiếu – không xuất';
}

export interface UserAssignedClipDescriptor {
  clipId: string;
  mediaId: string;
  name: string;
  url?: string;
  sourceDurationSec: number;
  sourceStartSec: number;
  sourceEndSec: number;
  speed: number; // Tỉ lệ tốc độ tự động điều chỉnh
  fitMode: FitMode;
  scaleMode: ScaleMode;
  cropOffset?: { x: number; y: number };
}

export interface RemixSlot {
  id: string;
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  role: SlotRole;
  label: { vi: string; en: string };
  refMedia: ReferenceMediaSlotDescriptor;
  assignedClip?: UserAssignedClipDescriptor;
  techniques: {
    transition?: SlotTechnique;
    effect?: SlotTechnique;
    look?: SlotTechnique;
    text?: SlotTextTechnique;
    beat?: SlotBeatTechnique;
  };
  userOverlays: Array<{
    id: string;
    effectId: string;
    name: string;
    enabled: boolean;
    params: Record<string, any>;
  }>;
  status: SlotStatus;
}

export interface ReferenceTimeline {
  id: string;
  referenceVideoId: string;
  referenceName: string;
  durationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  slots: RemixSlot[];
  totalSlots: number;
  filledSlotsCount: number;
  unfilledSlotsCount: number;
  comparisonMode: ComparisonMode;
  isMuted: boolean;
  playbackTimeSec: number;
}

export interface PreflightUnresolvedSlot {
  slotId: string;
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  role: SlotRole;
  status: SlotStatus;
  reason: string;
  availableActions: Array<'fill' | 'black' | 'cut'>;
}

export interface PreflightCheckResult {
  canExport: boolean;
  totalSlots: number;
  filledSlots: number;
  blackSlots: number;
  excludedSlots: number;
  emptySlots: number;
  unresolvedSlots: PreflightUnresolvedSlot[];
  mandatoryActionsRequired: boolean;
  warningNotice?: { vi: string; en: string };
}

export interface ApplyToProjectResult {
  success: boolean;
  projectId: string;
  target: 'new_project' | 'current_project';
  clipsCreated: number;
  tracksCreated: number;
  referenceMemoryRevoked: boolean;
  warnings: string[];
}

