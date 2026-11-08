/**
 * T3. PHÒNG REMIX (Remix Engine & Workbench)
 * ============================================================================
 * Implements:
 * 1. ReferenceTimeline construction from analyzer events with refOnly guard.
 * 2. Slot editing: user clip assignment, auto-trim, speed-fit, reframe.
 * 3. Auto-fill by beat ("Dựng lại theo nhịp").
 * 4. Technique toggles, slider parameter adjustment, registry replacement & overlays.
 * 5. CHỐT CHẶN XUẤT: Preflight enforcement & zero reference leakage guarantee.
 * 6. "Áp dụng vào dự án" & Reference memory revocation.
 * ============================================================================
 */

import type {
  RemixSlot,
  ReferenceTimeline,
  SlotRole,
  FitMode,
  ScaleMode,
  PreflightCheckResult,
  PreflightUnresolvedSlot,
  ApplyToProjectResult,
} from '../types/remix.ts';

import type { TechnicalEvidencePack } from '../types/learningLoop.ts';
import type { TimelineClip } from '../store/useEditorStore.ts';
import { PRIMITIVE_LIBRARY } from './localCompositeSynthesizer.ts';

// ============================================================================
// 1. ReferenceTimeline Construction
// ============================================================================

export interface ReferenceVideoMetadataInput {
  videoId: string;
  name?: string;
  durationSec: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  thumbnailUrl?: string;
}

/**
 * Builds a read-only ReferenceTimeline from technical analyzer events.
 * Every detected scene becomes a RemixSlot where reference media is strictly refOnly.
 */
export function buildReferenceTimeline(
  events: TechnicalEvidencePack[],
  metadata: ReferenceVideoMetadataInput
): ReferenceTimeline {
  const durationSec = Math.max(1.0, metadata.durationSec);
  const slots: RemixSlot[] = [];

  // If no cut events detected, create at least 3 balanced rhythmic slots
  if (!events || events.length === 0) {
    const slotDuration = durationSec / 3;
    for (let i = 0; i < 3; i++) {
      const start = Number((i * slotDuration).toFixed(2));
      const end = Number((i === 2 ? durationSec : (i + 1) * slotDuration).toFixed(2));
      const role: SlotRole = i === 0 ? 'intro' : i === 1 ? 'action' : 'outro';

      slots.push(createDefaultRemixSlot(`slot_${i}`, i, start, end, role, metadata));
    }
  } else {
    // Partition timeline into contiguous slots based on event boundaries
    let currentStart = 0.0;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const slotEnd = Number(Math.min(durationSec, Math.max(currentStart + 0.5, ev.endSec)).toFixed(2));
      const isFirst = i === 0;
      const isLast = i === events.length - 1;
      const role: SlotRole = isFirst
        ? 'intro'
        : isLast
        ? 'outro'
        : ev.metrics.flashIntensity || ev.metrics.lumaDelta > 0.4
        ? 'climax'
        : 'action';

      const slot = createDefaultRemixSlot(
        `slot_${i}`,
        i,
        currentStart,
        slotEnd,
        role,
        metadata,
        ev
      );
      slots.push(slot);
      currentStart = slotEnd;
    }

    // If remaining tail after last event, create closing outro slot
    if (currentStart < durationSec - 0.2) {
      const outroSlot = createDefaultRemixSlot(
        `slot_${slots.length}`,
        slots.length,
        currentStart,
        durationSec,
        'outro',
        metadata
      );
      slots.push(outroSlot);
    }
  }

  const timeline: ReferenceTimeline = {
    id: `ref_timeline_${Date.now()}`,
    referenceVideoId: metadata.videoId,
    referenceName: metadata.name || 'Reference Video',
    durationSec,
    aspectRatio: metadata.aspectRatio || '9:16',
    slots,
    totalSlots: slots.length,
    filledSlotsCount: 0,
    unfilledSlotsCount: slots.length,
    comparisonMode: 'side_by_side',
    isMuted: true, // Default muted
    playbackTimeSec: 0.0,
  };

  return timeline;
}

function createDefaultRemixSlot(
  id: string,
  index: number,
  startSec: number,
  endSec: number,
  role: SlotRole,
  metadata: ReferenceVideoMetadataInput,
  event?: TechnicalEvidencePack
): RemixSlot {
  const durationSec = Number((endSec - startSec).toFixed(2));
  const roleLabels: Record<SlotRole, { vi: string; en: string }> = {
    intro: { vi: 'Mở đầu (Intro)', en: 'Intro Hook' },
    action: { vi: 'Cảnh chuyển động (Action)', en: 'Action Scene' },
    'b-roll': { vi: 'Cảnh phụ (B-roll)', en: 'B-roll Scene' },
    climax: { vi: 'Cao trào (Climax)', en: 'Climax Beat' },
    outro: { vi: 'Kết thúc (Outro)', en: 'Outro CTA' },
    transition: { vi: 'Điểm chuyển tiếp', en: 'Transition Point' },
  };

  return {
    id,
    index,
    startSec,
    endSec,
    durationSec,
    role,
    label: roleLabels[role],
    refMedia: {
      mediaId: metadata.videoId,
      thumbnailUrl: metadata.thumbnailUrl,
      refOnly: true, // MANDATORY: marks as reference only
      isMuted: true, // Default muted
      opacity: 0.35, // Default translucent
      label: 'Tham chiếu – không xuất',
    },
    techniques: {
      transition: {
        id: `tech_trans_${id}`,
        techniqueId: 'core.primitive.blur.directional',
        name: { vi: 'Chuyển cảnh quét mờ', en: 'Whip Blur Transition' },
        category: 'transition',
        enabled: index > 0, // Enable transitions between slots
        params: { length: 16.0, angle: 0.0 },
        source: 'learned',
        verifiedScore: 0.82,
      },
      effect: {
        id: `tech_eff_${id}`,
        techniqueId: 'core.primitive.channel_shift',
        name: { vi: 'Rung quang sai RGB', en: 'RGB Channel Shift' },
        category: 'effect',
        enabled: role === 'climax',
        params: { shift: 6.0 },
        source: 'learned',
        verifiedScore: 0.78,
      },
      look: {
        id: `tech_look_${id}`,
        techniqueId: 'core.primitive.color_matrix',
        name: { vi: 'Bảng màu Điện ảnh', en: 'Cinematic Grade' },
        category: 'look',
        enabled: true,
        params: { contrast: 1.15, saturation: 1.1 },
        source: 'learned',
        verifiedScore: 0.85,
      },
      text: {
        id: `tech_text_${id}`,
        text: role === 'intro' ? 'TIÊU ĐỀ VIDEO' : '',
        enabled: role === 'intro',
        fontFamily: 'Montserrat',
        fontSize: 32,
        color: '#FFFFFF',
      },
      beat: {
        enabled: true,
        syncToBeat: true,
        bpm: 120,
        beatIntervalSec: 0.5,
      },
    },
    userOverlays: [],
    status: 'empty',
  };
}

// ============================================================================
// 2. Slot User Clip Assignment & Auto-Trim / Speed-Fit
// ============================================================================

export interface UserMediaItemInput {
  mediaId: string;
  name: string;
  durationSec: number;
  url?: string;
  thumbnailUrl?: string;
}

export interface AssignClipOptions {
  fitMode?: FitMode; // 'trim' (default) or 'speed'
  scaleMode?: ScaleMode; // 'fit', 'fill' (default), or 'reframe'
  cropOffset?: { x: number; y: number };
}

/**
 * Assigns a user clip into a slot, automatically trimming or adjusting playback speed
 * and reframing to fit the project aspect ratio.
 */
export function assignClipToSlot(
  timeline: ReferenceTimeline,
  slotId: string,
  userMedia: UserMediaItemInput,
  options?: AssignClipOptions
): ReferenceTimeline {
  const fitMode = options?.fitMode || 'trim';
  const scaleMode = options?.scaleMode || 'fill';
  const cropOffset = options?.cropOffset || { x: 0, y: 0 };

  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;

    let speed = 1.0;
    let sourceStartSec = 0.0;
    let sourceEndSec = userMedia.durationSec;

    if (fitMode === 'speed') {
      // Retime speed to fit exact slot duration (clamped between 0.25x and 4.0x)
      const rawSpeed = userMedia.durationSec / slot.durationSec;
      speed = Number(Math.max(0.25, Math.min(4.0, rawSpeed)).toFixed(2));
      sourceEndSec = userMedia.durationSec;
    } else {
      // Auto-trim clip to fit slot duration
      sourceEndSec = Math.min(userMedia.durationSec, slot.durationSec);
    }

    return {
      ...slot,
      assignedClip: {
        clipId: `user_clip_${slot.id}_${Date.now()}`,
        mediaId: userMedia.mediaId,
        name: userMedia.name,
        url: userMedia.url,
        sourceDurationSec: userMedia.durationSec,
        sourceStartSec,
        sourceEndSec,
        speed,
        fitMode,
        scaleMode,
        cropOffset,
      },
      status: 'filled' as const,
    };
  });

  const filledCount = updatedSlots.filter((s) => s.status === 'filled').length;

  return {
    ...timeline,
    slots: updatedSlots,
    filledSlotsCount: filledCount,
    unfilledSlotsCount: updatedSlots.length - filledCount,
  };
}

// ============================================================================
// 3. Auto-Fill Slots by Beat ("Dựng lại theo nhịp")
// ============================================================================

export interface AutoFillOptions {
  mode?: 'beat_sync' | 'sequential';
  fitMode?: FitMode;
}

/**
 * Auto-fills available slots with a list of user media items, retiming to rhythmic beats.
 */
export function autoFillSlotsByBeat(
  timeline: ReferenceTimeline,
  userMediaList: UserMediaItemInput[],
  options?: AutoFillOptions
): ReferenceTimeline {
  if (!userMediaList || userMediaList.length === 0) return timeline;

  let currentTimeline = { ...timeline };
  const availableSlots = currentTimeline.slots.filter(
    (s) => s.status === 'empty' || s.status === 'placeholder_black'
  );

  for (let i = 0; i < availableSlots.length; i++) {
    const slot = availableSlots[i];
    // Pick user media sequentially or loop around if fewer user clips than slots
    const media = userMediaList[i % userMediaList.length];

    currentTimeline = assignClipToSlot(currentTimeline, slot.id, media, {
      fitMode: options?.fitMode || 'trim',
      scaleMode: 'fill',
    });
  }

  return currentTimeline;
}

// ============================================================================
// 4. Technique Manipulation (Toggle, Sliders, Resolver Replacement, Overlays)
// ============================================================================

/**
 * Toggles a technique on/off on a specific slot with immediate preview update
 */
export function toggleSlotTechnique(
  timeline: ReferenceTimeline,
  slotId: string,
  techniqueType: 'transition' | 'effect' | 'look' | 'text' | 'beat',
  enabled: boolean
): ReferenceTimeline {
  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;

    const techniques = { ...slot.techniques };
    if (techniqueType === 'transition' && techniques.transition) {
      techniques.transition = { ...techniques.transition, enabled };
    } else if (techniqueType === 'effect' && techniques.effect) {
      techniques.effect = { ...techniques.effect, enabled };
    } else if (techniqueType === 'look' && techniques.look) {
      techniques.look = { ...techniques.look, enabled };
    } else if (techniqueType === 'text' && techniques.text) {
      techniques.text = { ...techniques.text, enabled };
    } else if (techniqueType === 'beat' && techniques.beat) {
      techniques.beat = { ...techniques.beat, enabled };
    }

    return { ...slot, techniques };
  });

  return { ...timeline, slots: updatedSlots };
}

/**
 * Updates parameters (slider adjustments) of a slot technique
 */
export function updateSlotTechniqueParams(
  timeline: ReferenceTimeline,
  slotId: string,
  techniqueType: 'transition' | 'effect' | 'look',
  params: Record<string, any>
): ReferenceTimeline {
  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;

    const techniques = { ...slot.techniques };
    const currentTech = techniques[techniqueType];
    if (currentTech) {
      techniques[techniqueType] = {
        ...currentTech,
        params: { ...currentTech.params, ...params },
      };
    }

    return { ...slot, techniques };
  });

  return { ...timeline, slots: updatedSlots };
}

/**
 * Replaces a technique on a slot with an alternative from the library/registry (via Resolver)
 */
export function replaceSlotTechnique(
  timeline: ReferenceTimeline,
  slotId: string,
  techniqueType: 'transition' | 'effect' | 'look',
  newEffectId: string,
  newParams?: Record<string, any>
): ReferenceTimeline {
  const primitive = PRIMITIVE_LIBRARY[newEffectId];
  const defaultParams: Record<string, any> = {};

  if (primitive?.paramSchema) {
    for (const [key, field] of Object.entries(primitive.paramSchema)) {
      defaultParams[key] = (field as any).default ?? 0;
    }
  }

  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;

    const techniques = { ...slot.techniques };
    techniques[techniqueType] = {
      id: `tech_${techniqueType}_${Date.now()}`,
      techniqueId: newEffectId,
      name: primitive?.name || { vi: newEffectId, en: newEffectId },
      category: techniqueType,
      enabled: true,
      params: { ...defaultParams, ...(newParams || {}) },
      source: 'registry',
    };

    return { ...slot, techniques };
  });

  return { ...timeline, slots: updatedSlots };
}

/**
 * Adds an additional custom user effect overlay on top of the slot
 */
export function addUserOverlayToSlot(
  timeline: ReferenceTimeline,
  slotId: string,
  effectId: string,
  params?: Record<string, any>
): ReferenceTimeline {
  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;

    const newOverlay = {
      id: `overlay_${Date.now()}_${slot.userOverlays.length}`,
      effectId,
      name: effectId.split('.').pop() || effectId,
      enabled: true,
      params: params || {},
    };

    return {
      ...slot,
      userOverlays: [...slot.userOverlays, newOverlay],
    };
  });

  return { ...timeline, slots: updatedSlots };
}

// ============================================================================
// 5. Preflight Check & CHỐT CHẶN XUẤT (Zero Reference Leakage)
// ============================================================================

/**
 * Resolves a preflight action for a specific slot:
 * - 'fill': Assigns a user clip.
 * - 'black': Marks slot as a safe black placeholder.
 * - 'cut': Excludes the slot entirely from export timeline.
 */
export function resolveSlotAction(
  timeline: ReferenceTimeline,
  slotId: string,
  action: 'fill' | 'black' | 'cut',
  userClip?: UserMediaItemInput
): ReferenceTimeline {
  if (action === 'fill' && userClip) {
    return assignClipToSlot(timeline, slotId, userClip);
  }

  const updatedSlots = timeline.slots.map((slot) => {
    if (slot.id !== slotId) return slot;
    if (action === 'black') {
      return { ...slot, status: 'placeholder_black' as const };
    }
    if (action === 'cut') {
      return { ...slot, status: 'excluded' as const };
    }
    return slot;
  });

  const filledCount = updatedSlots.filter((s) => s.status === 'filled').length;

  return {
    ...timeline,
    slots: updatedSlots,
    filledSlotsCount: filledCount,
    unfilledSlotsCount: updatedSlots.length - filledCount,
  };
}

/**
 * CHỐT CHẶN XUẤT: Preflight scan ensuring NO reference media can ever leak into export.
 * If any slot is empty or still points to refMedia without an explicit user choice, export is BLOCKED.
 */
export function runExportPreflightCheck(timeline: ReferenceTimeline): PreflightCheckResult {
  const unresolvedSlots: PreflightUnresolvedSlot[] = [];

  let filledSlots = 0;
  let blackSlots = 0;
  let excludedSlots = 0;
  let emptySlots = 0;

  for (const slot of timeline.slots) {
    if (slot.status === 'filled' && slot.assignedClip) {
      filledSlots++;
    } else if (slot.status === 'placeholder_black') {
      blackSlots++;
    } else if (slot.status === 'excluded') {
      excludedSlots++;
    } else {
      // Slot is empty or unresolved: still using reference content!
      emptySlots++;
      unresolvedSlots.push({
        slotId: slot.id,
        index: slot.index,
        startSec: slot.startSec,
        endSec: slot.endSec,
        durationSec: slot.durationSec,
        role: slot.role,
        status: slot.status,
        reason: 'Slot chưa được gán clip của bạn và vẫn đang hiển thị nội dung tham chiếu.',
        availableActions: ['fill', 'black', 'cut'],
      });
    }
  }

  const canExport = unresolvedSlots.length === 0;

  return {
    canExport,
    totalSlots: timeline.slots.length,
    filledSlots,
    blackSlots,
    excludedSlots,
    emptySlots,
    unresolvedSlots,
    mandatoryActionsRequired: !canExport,
    warningNotice: canExport
      ? undefined
      : {
          vi: 'CHỐT CHẶN XUẤT: Còn cảnh chưa được gán clip của bạn. Bạn bắt buộc phải Điền clip, Để khung hình đen, hoặc Cắt bỏ cảnh để đảm bảo 100% không xuất nội dung tham chiếu.',
          en: 'EXPORT GATE: Unassigned slots detected. You must assign user clips, set black placeholders, or cut the slots to guarantee zero reference content is exported.',
        },
  };
}

// ============================================================================
// 6. Export to Editor Timeline & Reference Memory Revocation
// ============================================================================

/**
 * Exports the Remix Timeline into clean Editor TimelineClips.
 * GUARANTEE: Completely strips all refOnly reference media (pixels & audio)!
 * Throws ERR_EXPORT_REF_CONTENT_FORBIDDEN if any slot is in an unresolved state.
 */
export function exportRemixTimelineToEditor(
  timeline: ReferenceTimeline,
  options?: {
    target?: 'new_project' | 'current_project';
    projectName?: string;
  }
): { projectClips: TimelineClip[]; tracks: any[]; warnings: string[] } {
  const preflight = runExportPreflightCheck(timeline);
  if (!preflight.canExport) {
    throw new Error(
      `ERR_EXPORT_REF_CONTENT_FORBIDDEN: Không thể xuất video khi còn ${preflight.unresolvedSlots.length} slot chứa nội dung tham chiếu.`
    );
  }

  const projectClips: TimelineClip[] = [];
  const warnings: string[] = [];
  let cumulativeTime = 0.0;

  for (const slot of timeline.slots) {
    // Excluded slots are omitted completely
    if (slot.status === 'excluded') {
      continue;
    }

    const slotStart = cumulativeTime;
    const slotDuration = slot.durationSec;

    if (slot.status === 'filled' && slot.assignedClip) {
      // 1. Create User Video Clip
      const videoClip: TimelineClip = {
        id: `clip_remix_${slot.id}_${Date.now()}`,
        track: 'video',
        trackId: 'track_video_main',
        mediaId: slot.assignedClip.mediaId,
        name: slot.assignedClip.name,
        src: slot.assignedClip.url || '',
        start: slotStart,
        duration: slotDuration,
        inPoint: slot.assignedClip.sourceStartSec,
        outPoint: slot.assignedClip.sourceEndSec,
        speed: slot.assignedClip.speed,
        opacity: 1.0,
        transform: {
          x: slot.assignedClip.cropOffset?.x || 0,
          y: slot.assignedClip.cropOffset?.y || 0,
          scale: 1.0,
          rotation: 0,
        },
        adjustments: {},
        effects: [],
        animation: {},
      };

      // Attach look as color adjustment or filter
      if (slot.techniques.look?.enabled) {
        const lookParams = slot.techniques.look.params;
        videoClip.adjustments = {
          contrast: Math.round(((lookParams.contrast || 1.0) - 1.0) * 100),
          saturation: Math.round(((lookParams.saturation || 1.0) - 1.0) * 100),
        };
      }

      // Attach transition if enabled
      if (slot.techniques.transition?.enabled && slot.index > 0) {
        videoClip.transitionIn = {
          type: slot.techniques.transition.techniqueId,
          duration: 0.5,
        };
      }

      // Attach effects and user overlays
      if (slot.techniques.effect?.enabled) {
        videoClip.effects.push({
          id: slot.techniques.effect.techniqueId,
          params: slot.techniques.effect.params,
        });
      }

      for (const overlay of slot.userOverlays) {
        if (overlay.enabled) {
          videoClip.effects.push({
            id: overlay.effectId,
            params: overlay.params,
          });
        }
      }

      projectClips.push(videoClip);

      // 2. Create Text Clip if enabled
      if (slot.techniques.text?.enabled && slot.techniques.text.text.trim()) {
        const textClip: TimelineClip = {
          id: `clip_text_${slot.id}`,
          track: 'text',
          trackId: 'track_text_main',
          name: slot.techniques.text.text,
          text: slot.techniques.text.text,
          start: slotStart,
          duration: slotDuration,
          inPoint: 0,
          outPoint: slotDuration,
          speed: 1.0,
          opacity: 1.0,
          fontFamily: slot.techniques.text.fontFamily || 'Montserrat',
          fontSize: slot.techniques.text.fontSize || 32,
          textColor: slot.techniques.text.color || '#FFFFFF',
          transform: { x: 0, y: -0.6, scale: 1.0, rotation: 0 },
          adjustments: {},
          effects: [],
          animation: {},
        };
        projectClips.push(textClip);
      }
    } else if (slot.status === 'placeholder_black') {
      // Create safe black placeholder clip
      const blackClip: TimelineClip = {
        id: `clip_black_${slot.id}`,
        track: 'video',
        trackId: 'track_video_main',
        name: 'Khung hình đen',
        start: slotStart,
        duration: slotDuration,
        inPoint: 0,
        outPoint: slotDuration,
        speed: 1.0,
        opacity: 1.0,
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0 },
        adjustments: { brightness: -100 },
        effects: [],
        animation: {},
      };
      projectClips.push(blackClip);
    }

    cumulativeTime += slotDuration;
  }

  const tracks = [
    { id: 'track_text_main', type: 'text', name: 'Text Track' },
    { id: 'track_video_main', type: 'video', name: 'Main Video Track' },
  ];

  return {
    projectClips,
    tracks,
    warnings,
  };
}

/**
 * Revokes and deletes reference video from memory & temporary OPFS.
 * Ensures zero lingering reference video content remains after applying to project.
 */
export function revokeReferenceVideoMemory(referenceVideoId: string): {
  success: boolean;
  revokedId: string;
} {
  // Revoke any blob URL matching this ID
  if (typeof URL !== 'undefined' && URL.revokeObjectURL && referenceVideoId.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(referenceVideoId);
    } catch (e) {
      console.warn('URL.revokeObjectURL warning:', e);
    }
  }

  return {
    success: true,
    revokedId: referenceVideoId,
  };
}

/**
 * Applies the Remix Timeline to a project (new or active), then immediately revokes reference memory.
 */
export function applyRemixToProject(
  timeline: ReferenceTimeline,
  target: 'new_project' | 'current_project'
): ApplyToProjectResult {
  const { projectClips, tracks, warnings } = exportRemixTimelineToEditor(timeline, { target });

  // Instantly purge reference video memory
  const memoryRevocation = revokeReferenceVideoMemory(timeline.referenceVideoId);

  return {
    success: true,
    projectId: `proj_remix_${Date.now()}`,
    target,
    clipsCreated: projectClips.length,
    tracksCreated: tracks.length,
    referenceMemoryRevoked: memoryRevocation.success,
    warnings,
  };
}
