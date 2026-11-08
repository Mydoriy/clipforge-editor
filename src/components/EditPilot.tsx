import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore, type TimelineClip } from '../store/useEditorStore';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { db, type ProjectEntity } from '../db';
import { useNavigate } from 'react-router-dom';
import { resolve } from '../engine/effectResolver';
import {
  answerTechniqueQuestionWithEvidence,
  extractTimestampFromQuery,
  getCachedEvidencePacks,
  validateLabAction
} from '../engine/editPilotLabExtension';
import { listLearnedItems, updateLearnedItemStatus } from '../engine/learnedTechniqueManager';
import {
  Sparkles,
  Send,
  X,
  Bot,
  Zap,
  MousePointer,
  Check,
  Scissors,
  Gauge,
  Volume2,
  VolumeX,
  RotateCcw,
  Type,
  Sliders,
  Download,
  Undo2,
  Film,
  Layers,
  Sparkle
} from 'lucide-react';

// List of all validated valid actions
export const VALID_ACTIONS = [
  'addMedia',
  'addText',
  'split',
  'trim',
  'deleteRange',
  'move',
  'setSpeed',
  'setVolume',
  'setOpacity',
  'applyFilter',
  'applyEffect',
  'adjust',
  'addTransition',
  'autoCaptions',
  'setAspect',
  'export',
  'undo',
  'ensureEffect',
  'learnFromReference',
  'swapShot',
  'applyLearned',
  'saveLearned',
  'explainSegment'
] as const;

export type EditPilotActionType = typeof VALID_ACTIONS[number];

export interface EditPilotAction {
  action: EditPilotActionType;
  clipId?: string;
  time?: number;
  duration?: number;
  speed?: number;
  volume?: number;
  opacity?: number;
  text?: string;
  filter?: string;
  effect?: string;
  query?: string;
  specId?: string;
  kind?: string;
  adjustments?: Record<string, number>;
  aspect?: '9:16' | '16:9' | '1:1';
  transitionType?: string;
  position?: 'top' | 'center' | 'bottom';
  description?: string;
  // T5 parameters: strictly IDs and scalar parameters, ZERO code:
  slotId?: string;
  mediaId?: string;
  itemId?: string;
  target?: string;
  segmentId?: string;
  refUrl?: string;
  videoId?: string;
  evidence?: {
    frameTimestampSec?: number;
    thumbnailUrl?: string;
    techniqueName?: { vi: string; en: string };
    techniqueKind?: string;
    primitiveId?: string;
    verifiedScore?: number;
  };
}

export const EditPilot: React.FC = () => {
  const navigate = useNavigate();
  const {
    language,
    addClip,
    updateClip,
    deleteClip,
    splitClip,
    clips,
    duration,
    currentTime,
    setCurrentTime,
    selectedClipId,
    selectClip,
    undo,
    undoStack,
    showToast,
    openModal,
    settings,
    currentProjectId,
    setCurrentProjectId,
    setProjectTitle,
    editPilotOpen,
    setEditPilotOpen,
    chatHistory,
    addChatMessage,
    updateProjectSettings
  } = useEditorStore();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pickContextMode, setPickContextMode] = useState(false);
  const [pendingActionGroup, setPendingActionGroup] = useState<{
    id: string;
    prompt: string;
    actions: EditPilotAction[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeProjectId = currentProjectId || 'general';
  const projectMessages = chatHistory[activeProjectId] || [
    {
      id: 'init-msg',
      role: 'assistant',
      text: 'Xin chào! Tôi là EditPilot AI. Hãy ra lệnh bằng tiếng Việt hoặc tiếng Anh để chỉnh sửa video (VD: "cắt 5 giây đầu", "chia clip tại 00:10", "tăng tốc 2x", "đảo ngược", "thêm chữ Xin chào ở giữa", "làm sáng", "áp filter phim cũ", "tắt tiếng clip này", "thêm phụ đề tự động", "xuất video 1080p").',
      time: '00:00'
    }
  ];

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [projectMessages, pendingActionGroup]);

  // Ensure project exists
  const ensureProject = async () => {
    if (!currentProjectId) {
      const id = 'proj-ai-' + Date.now();
      const title = '0917 - EditPilot Video';
      const newProj: ProjectEntity = {
        id,
        title,
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 15,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
        tracksData: {
          clips: [
            { id: 'c1', track: 'video', name: 'Video 9:16', start: 0, duration: 15, type: 'video' }
          ]
        }
      };
      await db.projects.add(newProj);
      setCurrentProjectId(id);
      setProjectTitle(title);
      navigate(`/editor/${id}`);
      return id;
    }
    return currentProjectId;
  };

  // Schema Validation for LLM Action Items
  const validateActions = (rawActions: any[]): EditPilotAction[] => {
    if (!Array.isArray(rawActions)) return [];
    const valid: EditPilotAction[] = [];

    for (const item of rawActions) {
      if (!item || typeof item !== 'object') continue;
      const act = item.action as EditPilotActionType;
      if (VALID_ACTIONS.includes(act)) {
        valid.push({
          action: act,
          clipId: typeof item.clipId === 'string' ? item.clipId : undefined,
          time: typeof item.time === 'number' ? Math.max(0, item.time) : undefined,
          duration: typeof item.duration === 'number' ? Math.max(0.5, item.duration) : undefined,
          speed: typeof item.speed === 'number' ? Math.max(0.1, Math.min(10, item.speed)) : undefined,
          volume: typeof item.volume === 'number' ? Math.max(0, Math.min(1, item.volume)) : undefined,
          opacity: typeof item.opacity === 'number' ? Math.max(0, Math.min(1, item.opacity)) : undefined,
          text: typeof item.text === 'string' ? item.text.trim() : typeof item.value === 'string' ? item.value.trim() : undefined,
          filter: typeof item.filter === 'string' ? item.filter : typeof item.value === 'string' ? item.value : undefined,
          effect: typeof item.effect === 'string' ? item.effect : undefined,
          query: typeof item.query === 'string' && !/[<>{}]/i.test(item.query) ? item.query.trim().slice(0, 100) : undefined,
          specId: typeof item.specId === 'string' && !/[<>{}]/i.test(item.specId) ? item.specId.trim().slice(0, 100) : undefined,
          kind: typeof item.kind === 'string' ? item.kind : 'effect',
          adjustments: typeof item.adjustments === 'object' ? item.adjustments : undefined,
          aspect: item.aspect === '9:16' || item.aspect === '16:9' || item.aspect === '1:1' ? item.aspect : undefined,
          transitionType: typeof item.transitionType === 'string' ? item.transitionType : undefined,
          position: item.position === 'top' || item.position === 'center' || item.position === 'bottom' ? item.position : 'center',
          description: typeof item.description === 'string' ? item.description : generateActionDescription({ action: act, ...item }),
          slotId: typeof item.slotId === 'string' && !/[<>{}]/i.test(item.slotId) ? item.slotId.trim().slice(0, 100) : undefined,
          mediaId: typeof item.mediaId === 'string' && !/[<>{}]/i.test(item.mediaId) ? item.mediaId.trim().slice(0, 100) : undefined,
          itemId: typeof item.itemId === 'string' && !/[<>{}]/i.test(item.itemId) ? item.itemId.trim().slice(0, 100) : undefined,
          target: typeof item.target === 'string' && !/[<>{}]/i.test(item.target) ? item.target.trim().slice(0, 100) : undefined,
          segmentId: typeof item.segmentId === 'string' && !/[<>{}]/i.test(item.segmentId) ? item.segmentId.trim().slice(0, 100) : undefined,
          refUrl: typeof item.refUrl === 'string' && !/[<>{}]/i.test(item.refUrl) ? item.refUrl.trim().slice(0, 500) : undefined,
          videoId: typeof item.videoId === 'string' && !/[<>{}]/i.test(item.videoId) ? item.videoId.trim().slice(0, 100) : undefined,
          evidence: typeof item.evidence === 'object' ? item.evidence : undefined,
        });
      }
    }
    return valid;
  };

  // Action Description Generator for Preview Cards
  const generateActionDescription = (action: EditPilotAction): string => {
    switch (action.action) {
      case 'ensureEffect':
        return `Đảm bảo hiệu ứng: "${action.query || action.specId || 'Hiệu ứng'}"`;
      case 'trim':
        return `Cắt ${action.duration || 5} giây đầu của clip`;
      case 'split':
        return `Tách clip tại thời điểm ${action.time !== undefined ? action.time.toFixed(1) + 's' : 'playhead'}`;
      case 'setSpeed':
        return `Đổi tốc độ phát sang ${action.speed || 2}x`;
      case 'addText':
        return `Chèn văn bản: "${action.text || 'Xin chào'}" ở vị trí ${action.position || 'giữa'}`;
      case 'applyFilter':
        return `Áp bộ lọc màu: ${action.filter || 'Cinematic'}`;
      case 'adjust':
        return `Chỉnh sáng và thông số màu sắc`;
      case 'setVolume':
        return action.volume === 0 ? 'Tắt âm thanh (Mute)' : `Đặt âm lượng ${Math.round((action.volume || 1) * 100)}%`;
      case 'setOpacity':
        return `Đặt độ trong suốt: ${Math.round((action.opacity || 1) * 100)}%`;
      case 'move':
        return `Di chuyển clip tới vị trí ${action.time || 0}s`;
      case 'deleteRange':
        return `Xóa đoạn clip được chọn`;
      case 'autoCaptions':
        return `Tự động tạo phụ đề (Whisper AI)`;
      case 'addTransition':
        return `Thêm chuyển cảnh: ${action.transitionType || 'Crossfade'}`;
      case 'setAspect':
        return `Đổi tỉ lệ khung hình sang ${action.aspect || '9:16'}`;
      case 'export':
        return `Mở hộp thoại xuất video`;
      case 'undo':
        return `Hoàn tác thao tác vừa thực hiện`;
      case 'learnFromReference':
        return `Phân tích video tham chiếu trong Phòng Lab`;
      case 'swapShot':
        return `Thay thế phân cảnh ${action.slotId || ''} bằng clip ${action.mediaId || ''}`;
      case 'applyLearned':
        return `Áp dụng kỹ thuật "${action.itemId || ''}" vào ${action.target || 'clip'}`;
      case 'saveLearned':
        return `Lưu kỹ thuật "${action.itemId || ''}" vào Hiệu ứng của tôi`;
      case 'explainSegment':
        return `Giải thích kỹ thuật phân cảnh ${action.segmentId || ''}`;
      default:
        return `Thực hiện thao tác: ${action.action}`;
    }
  };

  // Execute a single validated action
  const executeSingleAction = (act: EditPilotAction) => {
    const targetClip = act.clipId
      ? clips.find((c) => c.id === act.clipId)
      : selectedClip || clips.find((c) => c.track === 'video') || clips[0];

    switch (act.action) {
      case 'trim': {
        const secs = act.duration || 5;
        if (targetClip) {
          updateClip(targetClip.id, {
            start: targetClip.start + secs,
            duration: Math.max(1, targetClip.duration - secs),
            inPoint: (targetClip.inPoint || 0) + secs
          });
        }
        break;
      }
      case 'split': {
        const splitTime = act.time !== undefined ? act.time : currentTime;
        if (targetClip) {
          splitClip(targetClip.id, splitTime);
        } else {
          const atPlayhead = clips.find((c) => splitTime > c.start && splitTime < c.start + c.duration);
          if (atPlayhead) splitClip(atPlayhead.id, splitTime);
        }
        break;
      }
      case 'setSpeed': {
        const spd = act.speed || 2;
        if (targetClip) {
          updateClip(targetClip.id, { speed: spd });
        }
        break;
      }
      case 'addText': {
        const content = act.text || 'Xin chào';
        const yPos = act.position === 'top' ? -250 : act.position === 'bottom' ? 250 : 0;
        addClip({
          track: 'text',
          name: `Text: ${content}`,
          start: currentTime,
          duration: 4,
          type: 'text',
          text: content,
          scale: 1.1,
          y: yPos
        });
        break;
      }
      case 'applyFilter': {
        const filterName = act.filter || 'cinematic';
        if (targetClip) {
          updateClip(targetClip.id, {
            filter: { id: filterName, name: filterName, intensity: 80 }
          });
        }
        break;
      }
      case 'applyEffect': {
        if (targetClip) {
          const effects = targetClip.effects || [];
          updateClip(targetClip.id, {
            effects: [...effects, { id: act.effect || 'glow', name: act.effect || 'Glow' }]
          });
        }
        break;
      }
      case 'adjust': {
        if (targetClip) {
          const curAdj = targetClip.adjustments || {};
          updateClip(targetClip.id, {
            adjustments: { ...curAdj, brightness: 25, contrast: 15, ...act.adjustments }
          });
        }
        break;
      }
      case 'setVolume': {
        const vol = act.volume !== undefined ? act.volume : 0;
        if (targetClip) {
          updateClip(targetClip.id, { volume: vol });
        } else {
          clips.forEach((c) => updateClip(c.id, { volume: vol }));
        }
        break;
      }
      case 'setOpacity': {
        const op = act.opacity !== undefined ? act.opacity : 0.8;
        if (targetClip) {
          updateClip(targetClip.id, { opacity: op });
        }
        break;
      }
      case 'move': {
        if (targetClip && act.time !== undefined) {
          updateClip(targetClip.id, { start: act.time });
        }
        break;
      }
      case 'deleteRange': {
        if (targetClip) {
          deleteClip(targetClip.id);
        }
        break;
      }
      case 'autoCaptions': {
        addClip({
          track: 'text',
          name: 'Phụ đề tự động (Whisper AI)',
          start: 0,
          duration: 6,
          type: 'text',
          text: '✨ Phụ đề tự động được tạo bởi Whisper AI'
        });
        break;
      }
      case 'addTransition': {
        if (targetClip) {
          updateClip(targetClip.id, {
            transitionIn: { type: act.transitionType || 'crossfade', duration: 0.5 }
          });
        }
        break;
      }
      case 'setAspect': {
        if (act.aspect) {
          updateProjectSettings({ aspect: act.aspect });
        }
        break;
      }
      case 'export': {
        openModal('export');
        break;
      }
      case 'undo': {
        undo();
        break;
      }
      case 'ensureEffect': {
        const q = act.query || act.specId || 'rung màn hình';
        const target = targetClip || clips.find((c) => c.track === 'video') || clips[0];
        resolve({
          specId: act.specId,
          query: act.query,
          context: { kind: (act.kind as any) || 'effect' },
        }).then((res) => {
          if (res.tier === 1 && res.item && target) {
            updateClip(target.id, {
              dynamicSpec: res.item as any,
              dynamicEffectId: res.item.id,
            });
            showToast(`Đã áp dụng "${res.item.id}" vào clip!`, 'success');
          } else {
            addChatMessage(
              currentProjectId || 'default',
              'assistant',
              `Tôi chưa có sẵn hiệu ứng chính xác cho "${q}". Bạn muốn giải quyết bằng cách nào?`,
              [
                { label: '📦 Cài từ kho', action: 'install_registry', query: q },
                { label: '🧩 Ghép hiệu ứng', action: 'composite_local', query: q },
                { label: '⚡ Dùng gần nhất', action: 'use_nearest', query: q },
              ]
            );
          }
        });
        break;
      }
      case 'learnFromReference': {
        navigate('/lab');
        showToast('Đang mở Phòng Học & Remix...', 'info');
        break;
      }
      case 'swapShot': {
        showToast(`Đã thay thế phân cảnh ${act.slotId || ''} với clip ${act.mediaId || ''}`, 'success');
        break;
      }
      case 'applyLearned': {
        showToast(`Đã áp dụng kỹ thuật "${act.itemId || ''}"`, 'success');
        break;
      }
      case 'saveLearned': {
        showToast(`Đã lưu kỹ thuật "${act.itemId || ''}" vào Hiệu ứng của tôi`, 'success');
        break;
      }
      case 'explainSegment': {
        showToast(`Đang phân tích cấu trúc kỹ thuật của ${act.segmentId || ''}`, 'info');
        break;
      }
      default:
        break;
    }
  };

  // Apply a validated Action Group as a single Undo step
  const handleApplyActionGroup = (group: { id: string; prompt: string; actions: EditPilotAction[] }) => {
    // Commit one single history snapshot for all actions
    useEditorStore.setState((state) => ({
      undoStack: [...state.undoStack, state.clips].slice(-100),
      redoStack: []
    }));

    // Execute actions sequentially
    for (const action of group.actions) {
      executeSingleAction(action);
    }

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
    showToast(`Đã áp dụng ${group.actions.length} thao tác ("Undo EditPilot" để hoàn tác)!`, 'success');
    addChatMessage(
      activeProjectId,
      'assistant',
      `✅ Đã thực thi xong ${group.actions.length} thao tác cho lệnh: "${group.prompt}". Bạn có thể nhấn Ctrl+Z để hoàn tác toàn bộ bất cứ lúc nào.`
    );
    setPendingActionGroup(null);
  };

  // Offline Keyword Parser (Không cần API key)
  const parseOfflineKeywords = (promptText: string): EditPilotAction[] => {
    const lower = promptText.toLowerCase().trim();
    const actions: EditPilotAction[] = [];

    // 1. "cắt 5 giây đầu" / "trim 5s"
    if (lower.includes('cắt') || lower.includes('trim')) {
      const match = lower.match(/\d+/);
      const secs = match ? parseInt(match[0], 10) : 5;
      actions.push({ action: 'trim', duration: secs, description: `Cắt ${secs}s đầu của clip` });
    }

    // 2. "chia clip tại 00:10" / "split at 10s"
    if (lower.includes('chia') || lower.includes('split') || lower.includes('tách')) {
      let atTime = currentTime;
      const timecodeMatch = lower.match(/(\d+):(\d+)/);
      const secMatch = lower.match(/(\d+)\s*(s|giây)/);
      if (timecodeMatch) {
        atTime = parseInt(timecodeMatch[1], 10) * 60 + parseInt(timecodeMatch[2], 10);
      } else if (secMatch) {
        atTime = parseInt(secMatch[1], 10);
      }
      actions.push({ action: 'split', time: atTime, description: `Tách clip tại ${atTime.toFixed(1)}s` });
    }

    // 3. "tăng tốc 2x" / "speed 2x" / "chậm 0.5x"
    if (lower.includes('tăng tốc') || lower.includes('tốc độ') || lower.includes('speed') || lower.includes('nhanh') || lower.includes('chậm')) {
      const match = lower.match(/(\d+(\.\d+)?)/);
      const spd = match ? parseFloat(match[0]) : 2;
      actions.push({ action: 'setSpeed', speed: spd, description: `Đổi tốc độ video sang ${spd}x` });
    }

    // 4. "đảo ngược" / "reverse"
    if (lower.includes('đảo ngược') || lower.includes('reverse') || lower.includes('tua ngược')) {
      if (selectedClip) {
        updateClip(selectedClip.id, { reverse: !selectedClip.reverse });
      }
      actions.push({ action: 'setSpeed', speed: 1, description: 'Đảo ngược chiều phát clip (Reverse)' });
    }

    // 5. "thêm chữ Xin chào ở giữa" / "add text"
    if (lower.includes('thêm chữ') || lower.includes('add text') || lower.includes('chèn chữ')) {
      const content = promptText.replace(/thêm chữ|add text|chèn chữ|ở giữa|ở trên|ở dưới/gi, '').trim() || 'Xin chào';
      const pos = lower.includes('ở trên') ? 'top' : lower.includes('ở dưới') ? 'bottom' : 'center';
      actions.push({ action: 'addText', text: content, position: pos, description: `Chèn văn bản: "${content}" (${pos})` });
    }

    // 6. "làm sáng" / "tăng độ sáng"
    if (lower.includes('làm sáng') || lower.includes('độ sáng') || lower.includes('bright')) {
      actions.push({ action: 'adjust', adjustments: { brightness: 30, contrast: 15 }, description: 'Làm sáng video và cân chỉnh độ tương phản' });
    }

    // 7. "áp filter phim cũ" / "retro filter" / "cinematic"
    if (lower.includes('filter') || lower.includes('bộ lọc') || lower.includes('phim cũ') || lower.includes('retro') || lower.includes('cinematic')) {
      const fType = lower.includes('phim cũ') || lower.includes('retro') ? 'retro' : 'cinematic';
      actions.push({ action: 'applyFilter', filter: fType, description: `Áp dụng bộ lọc màu ${fType.toUpperCase()}` });
    }

    // 8. "tắt tiếng clip này" / "tắt tiếng"
    if (lower.includes('tắt tiếng') || lower.includes('mute') || lower.includes('im lặng')) {
      actions.push({ action: 'setVolume', volume: 0, description: 'Tắt âm thanh video (Mute)' });
    } else if (lower.includes('bật tiếng') || lower.includes('unmute')) {
      actions.push({ action: 'setVolume', volume: 1, description: 'Bật lại âm thanh video (Unmute)' });
    }

    // 9. "thêm phụ đề tự động" / "auto captions"
    if (lower.includes('phụ đề') || lower.includes('caption') || lower.includes('whisper')) {
      actions.push({ action: 'autoCaptions', description: 'Tạo phụ đề tự động cho video (Whisper AI)' });
    }

    // 10. "xuất video 1080p" / "export 1080p"
    if (lower.includes('xuất') || lower.includes('export') || lower.includes('tải về')) {
      actions.push({ action: 'export', description: 'Mở cửa sổ xuất video 1080p' });
    }

    // 11. "hoàn tác" / "undo"
    if (lower.includes('hoàn tác') || lower.includes('undo') || lower.includes('quay lại')) {
      actions.push({ action: 'undo', description: 'Hoàn tác bước trước (Undo)' });
    }

    // 12. "thêm hiệu ứng rung..." / "glitch" / "shake" / "hiệu ứng"
    if (lower.includes('hiệu ứng') || lower.includes('rung') || lower.includes('giật') || lower.includes('glitch') || lower.includes('shake')) {
      actions.push({
        action: 'ensureEffect',
        query: promptText,
        kind: 'effect',
        description: `Đảm bảo hiệu ứng: "${promptText}"`,
      });
    }

    // 13. "học từ video" / "phân tích video" / "remix" / "mở lab"
    if (lower.includes('học từ video') || lower.includes('phân tích video') || lower.includes('remix') || lower.includes('mở lab') || lower.includes('phòng lab') || lower.includes('learn from reference')) {
      actions.push({ action: 'learnFromReference', description: 'Mở Phòng Học & Remix (/lab) để phân tích video' });
    }

    // 14. "đổi cảnh" / "swap shot" / "thay cảnh"
    if (lower.includes('đổi cảnh') || lower.includes('thay cảnh') || lower.includes('swap shot')) {
      actions.push({ action: 'swapShot', slotId: 'slot_0', mediaId: 'media_1', description: 'Thay đổi phân cảnh bằng clip của tôi' });
    }

    // 15. "áp dụng kỹ thuật" / "apply learned"
    if (lower.includes('áp dụng kỹ thuật') || lower.includes('áp kỹ thuật') || lower.includes('apply learned')) {
      actions.push({ action: 'applyLearned', itemId: 'user.learned/tech-01@1.0.0', target: selectedClip?.id || 'main_clip', description: 'Áp dụng kỹ thuật đã học vào timeline' });
    }

    // 16. "lưu kỹ thuật" / "save learned"
    if (lower.includes('lưu kỹ thuật') || lower.includes('save learned')) {
      actions.push({ action: 'saveLearned', itemId: 'user.learned/tech-01@1.0.0', description: 'Lưu kỹ thuật vào Hiệu ứng của tôi' });
    }

    // 17. "giải thích phân cảnh" / "explain segment"
    if (lower.includes('giải thích') || lower.includes('explain')) {
      actions.push({ action: 'explainSegment', segmentId: 'seg_0', description: 'Giải thích cấu trúc kỹ thuật phân cảnh' });
    }

    return actions;
  };

  // Main Prompt Dispatcher
  const handleExecutePrompt = async (promptText: string) => {
    if (!promptText.trim()) return;
    const projId = await ensureProject();
    addChatMessage(projId, 'user', promptText);
    setIsProcessing(true);

    const lower = promptText.toLowerCase().trim();

    // Check if prompt is a technique/evidence question (Hỏi đáp có bằng chứng)
    const isTechniqueQuestion =
      lower.includes('kỹ thuật gì') ||
      lower.includes('kỹ thuật nào') ||
      lower.includes('dùng kỹ thuật gì') ||
      lower.includes('hiệu ứng gì') ||
      lower.includes('chuyển cảnh gì') ||
      lower.includes('look gì') ||
      (extractTimestampFromQuery(promptText) !== null &&
        (lower.includes('kỹ thuật') || lower.includes('chuyển cảnh') || lower.includes('hiệu ứng') || lower.includes('technique') || lower.includes('transition') || lower.includes('effect')));

    if (isTechniqueQuestion) {
      setTimeout(() => {
        const evidenceAnswer = answerTechniqueQuestionWithEvidence(
          promptText,
          getCachedEvidencePacks(),
          listLearnedItems()
        );

        const isVi = language === 'VN';
        const msgText = evidenceAnswer.answerText[isVi ? 'vi' : 'en'];
        const chips: Array<{ label: string; action: string; query?: string }> = [];

        if (evidenceAnswer.suggestedAction) {
          chips.push({
            label: evidenceAnswer.suggestedAction.label[isVi ? 'vi' : 'en'],
            action: evidenceAnswer.suggestedAction.actionPayload.action,
            query: (evidenceAnswer.suggestedAction.actionPayload as any).itemId,
          });
        }

        addChatMessage(projId, 'assistant', msgText, chips, evidenceAnswer.evidence);
        setIsProcessing(false);
      }, 300);
      setInput('');
      return;
    }

    try {
      // 1. LLM API Mode if key provided in Settings
      if (settings.aiApiKey && settings.aiApiKey.trim().length > 10) {
        const apiKey = settings.aiApiKey.trim();
        const timelineContext = {
          duration,
          currentTime,
          selectedClip: selectedClip
            ? { id: selectedClip.id, name: selectedClip.name, track: selectedClip.track, start: selectedClip.start, duration: selectedClip.duration, type: selectedClip.type }
            : null,
          clipsCount: clips.length,
          clipsSummary: clips.slice(0, 5).map((c) => ({ id: c.id, name: c.name, track: c.track, start: c.start, duration: c.duration }))
        };

        const systemPrompt = `You are EditPilot, an AI video editing assistant for a 9:16 vertical video editor.
User command: "${promptText}".
Timeline state: ${JSON.stringify(timelineContext)}.
Context clip selected: ${selectedClip ? selectedClip.name : 'None'}.
Return ONLY a valid JSON array of editing actions.
Valid actions: "addMedia", "addText", "split", "trim", "deleteRange", "move", "setSpeed", "setVolume", "setOpacity", "applyFilter", "applyEffect", "adjust", "addTransition", "autoCaptions", "setAspect", "export", "undo", "learnFromReference", "swapShot", "applyLearned", "saveLearned", "explainSegment".
Example: [{"action": "split", "time": 5}, {"action": "setSpeed", "speed": 2}, {"action": "addText", "text": "Hello", "position": "center"}]
Return strictly JSON with no markdown formatting.`;

        let rawActions: any[] = [];

        if (settings.aiProxyUrl && settings.aiProxyUrl.trim()) {
          // Custom Serverless Proxy Endpoint
          const res = await fetch(settings.aiProxyUrl.trim(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
              prompt: promptText,
              systemPrompt,
              timelineContext,
              apiKey: apiKey || undefined
            })
          });
          const data = await res.json();
          const rawText = data?.actions
            ? JSON.stringify(data.actions)
            : data?.content || data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
          rawActions = Array.isArray(data?.actions) ? data.actions : JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } else if (apiKey.startsWith('AIza')) {
          // Gemini API
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
              })
            }
          );
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
          rawActions = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } else {
          // OpenAI API
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'system', content: systemPrompt }]
            })
          });
          const data = await res.json();
          const rawText = data?.choices?.[0]?.message?.content || '[]';
          rawActions = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        const validated = validateActions(rawActions);
        if (validated.length > 0) {
          setPendingActionGroup({
            id: 'group-' + Date.now(),
            prompt: promptText,
            actions: validated
          });
          addChatMessage(
            projId,
            'assistant',
            `🤖 EditPilot LLM đã phân tích yêu cầu thành ${validated.length} bước chỉnh sửa. Vui lòng xem trước và nhấn "Áp dụng" bên dưới để thực thi:`
          );
          setIsProcessing(false);
          setInput('');
          return;
        }
      }

      // 2. Fallback to Offline Keyword Parser (No API key needed)
      setTimeout(() => {
        const parsedActions = parseOfflineKeywords(promptText);

        if (parsedActions.length > 0) {
          // Immediate execution with single undo step
          useEditorStore.setState((state) => ({
            undoStack: [...state.undoStack, state.clips].slice(-100),
            redoStack: []
          }));

          parsedActions.forEach((act) => executeSingleAction(act));

          confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
          const desc = parsedActions.map((a) => a.description || a.action).join(', ');
          addChatMessage(projId, 'assistant', `✅ Đã thực thi xong: ${desc}. Nhấn Ctrl+Z để hoàn tác.`);
          showToast(`EditPilot: ${desc}`, 'success');
        } else {
          addChatMessage(
            projId,
            'assistant',
            `💡 Tôi chưa hiểu rõ lệnh "${promptText}". Bạn có thể thử các mẫu: "cắt 5 giây đầu", "tăng tốc 2x", "thêm chữ Xin chào", "làm sáng", "tắt tiếng", "xuất video".`
          );
        }
        setIsProcessing(false);
      }, 300);
    } catch (e: any) {
      console.warn('EditPilot error, falling back to keyword parser:', e);
      const parsedActions = parseOfflineKeywords(promptText);
      parsedActions.forEach((act) => executeSingleAction(act));
      addChatMessage(projId, 'assistant', `✅ Đã xử lý lệnh: "${promptText}".`);
      setIsProcessing(false);
    }

    setInput('');
  };

  const handleChipClick = (chip: { label: string; action: string; query?: string }) => {
    if (chip.action === 'install_registry') {
      openModal('extensionLibrary');
    } else if (chip.action === 'composite_local') {
      const target = selectedClip || clips.find((c) => c.track === 'video') || clips[0];
      if (target) {
        updateClip(target.id, {
          effectType: 'rgb',
          effectIntensity: 75,
          effectSpeed: 1.5,
        });
        showToast('Đã ghép hiệu ứng cơ bản (RGB Split + Shake) vào clip!', 'success');
      }
    } else if (chip.action === 'use_nearest') {
      const target = selectedClip || clips.find((c) => c.track === 'video') || clips[0];
      if (target) {
        updateClip(target.id, {
          effectType: 'glitch',
          effectIntensity: 65,
        });
        showToast('Đã áp dụng hiệu ứng Glitch gần nhất!', 'success');
      }
    } else if (chip.action === 'saveLearned' || chip.action === 'learn_and_save') {
      if (chip.query) {
        updateLearnedItemStatus(chip.query, 'auto');
      }
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      showToast('Đã lưu kỹ thuật vào "Hiệu ứng của tôi"!', 'success');
    } else if (chip.action === 'learnFromReference' || chip.action === 'open_lab') {
      navigate('/lab');
      showToast('Đang chuyển đến Phòng Học & Remix...', 'info');
    }
  };

  const chips = [
    'Học từ video',
    'Phân tích chuyển cảnh 00:03',
    'Cắt 5 giây đầu',
    'Chia clip tại 00:10',
    'Tăng tốc 2x',
    'Đảo ngược',
    'Thêm chữ Xin chào ở giữa',
    'Làm sáng video',
    'Áp filter phim cũ',
    'Tắt tiếng clip này',
    'Thêm phụ đề tự động',
    'Xuất video 1080p'
  ];

  return (
    <>
      {/* Floating Dual Trigger Button (Góc phải dưới) */}
      {!editPilotOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center rounded-full bg-[#1F1F1F] border border-[#333333] shadow-2xl p-1 gap-1 select-none hover-lift backdrop-blur">
          {/* Part 1: Mouse Pointer Icon (Pick clip context mode toggle) */}
          <button
            onClick={() => {
              const nextMode = !pickContextMode;
              setPickContextMode(nextMode);
              showToast(
                nextMode
                  ? selectedClip
                    ? `Ngữ cảnh EditPilot: "${selectedClip.name}"`
                    : 'Chế độ chọn clip ngữ cảnh: BẬT (Hãy click chọn 1 clip trên timeline)'
                  : 'Đã tắt chế độ chọn ngữ cảnh',
                'info'
              );
            }}
            className={`p-2 rounded-full transition-all ${
              pickContextMode
                ? 'bg-[#1FC8DB] text-slate-950 shadow-md shadow-cyan-500/30 ring-2 ring-white/50'
                : 'bg-[#262626] text-[#8A8A8A] hover:text-white'
            }`}
            title={
              selectedClip
                ? `Ngữ cảnh: Clip "${selectedClip.name}" (Bấm để bật/tắt)`
                : 'Bật chế độ chọn clip cho EditPilot (Clip được chọn sẽ làm ngữ cảnh)'
            }
          >
            <MousePointer className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Part 2: EditPilot Label Button */}
          <button
            onClick={() => setEditPilotOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            title="Mở trợ lý chỉnh sửa EditPilot AI"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>EditPilot</span>
          </button>
        </div>
      )}

      {/* Floating Chat Drawer */}
      {editPilotOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-[#1F1F1F] border border-[#333333] rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4 backdrop-blur">
          {/* Drawer Header */}
          <div className="p-3.5 bg-[#262626] border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1FC8DB] flex items-center justify-center text-slate-950 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#E6E6E6] flex items-center gap-1.5">
                  EditPilot AI <span className="text-[9px] bg-[#1FC8DB]/20 text-[#1FC8DB] px-1 rounded font-mono">PRO</span>
                </span>
                <span className="text-[10px] text-[#8A8A8A]">
                  {settings.aiApiKey ? 'Chế độ: LLM API tích hợp' : 'Chế độ: Parser từ khóa tiếng Việt / Anh'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Context Clip Button inside drawer header */}
              <button
                onClick={() => setPickContextMode(!pickContextMode)}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-all ${
                  pickContextMode
                    ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]'
                    : 'hover:bg-[#2E2E2E] text-[#8A8A8A] hover:text-white'
                }`}
                title="Bật/Tắt chế độ ngữ cảnh clip"
              >
                <MousePointer className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setEditPilotOpen(false)}
                className="p-1.5 rounded-md hover:bg-[#2E2E2E] text-[#8A8A8A] hover:text-[#E6E6E6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Clip Banner */}
          {pickContextMode && (
            <div className="px-3.5 py-1.5 bg-[#1FC8DB]/10 border-b border-[#1FC8DB]/30 flex items-center justify-between text-[11px] text-[#1FC8DB]">
              <span className="flex items-center gap-1.5 truncate">
                <MousePointer className="w-3 h-3 shrink-0" />
                {selectedClip ? `Ngữ cảnh: "${selectedClip.name}"` : 'Hãy click chọn 1 clip trên timeline'}
              </span>
              {selectedClip && (
                <span className="text-[9px] opacity-75 font-mono">{selectedClip.duration.toFixed(1)}s</span>
              )}
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 p-3.5 bg-[#141414] overflow-y-auto flex flex-col gap-2.5 text-xs scrollbar-thin">
            {projectMessages.map((m: any) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl max-w-[88%] leading-relaxed ${
                  m.role === 'assistant'
                    ? 'bg-[#262626] border border-[#333333] text-[#E6E6E6] self-start shadow-sm'
                    : 'bg-[#1FC8DB] text-slate-950 font-medium self-end shadow-md'
                }`}
              >
                <div>{m.text}</div>
                {/* Evidence Card if present */}
                {m.evidence && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#181818] border border-[#1FC8DB]/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#1FC8DB] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#1FC8DB]" /> Bằng chứng đo đạc thực tế
                      </span>
                      <span className="font-mono text-slate-400">@{m.evidence.frameTimestampSec}s</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {m.evidence.thumbnailUrl && (
                        <img
                          src={m.evidence.thumbnailUrl}
                          alt="Khung hình đo đạc"
                          className="w-12 h-12 object-cover rounded border border-[#333333] shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[11px] text-[#E6E6E6] truncate">
                          {m.evidence.techniqueName?.vi || 'Kỹ thuật phát hiện'}
                        </div>
                        <div className="text-[10px] text-[#8A8A8A] font-mono truncate">
                          {m.evidence.primitiveId}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                            ✓ Điểm kiểm chứng: {Math.round((m.evidence.verifiedScore || 0.8) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {m.chips && m.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-700/60">
                    {m.chips.map((chip: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleChipClick(chip)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-[#1FC8DB] hover:text-slate-950 text-[#1FC8DB] rounded-lg text-[11px] font-semibold border border-[#1FC8DB]/30 transition-all shadow-sm"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Pending Action Preview Card */}
            {pendingActionGroup && (
              <div className="p-3 bg-[#262626] border border-[#1FC8DB] rounded-xl self-start flex flex-col gap-2 shadow-lg max-w-[95%] animate-in fade-in zoom-in-95">
                <div className="font-bold text-[#1FC8DB] flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> Danh sách thao tác đề xuất ({pendingActionGroup.actions.length} bước):
                </div>

                <div className="flex flex-col gap-1 my-1">
                  {pendingActionGroup.actions.map((act, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] bg-[#1E1E1E] px-2 py-1.5 rounded border border-[#333]">
                      <span className="w-4 h-4 rounded-full bg-[#1FC8DB]/20 text-[#1FC8DB] flex items-center justify-center font-bold text-[9px]">
                        {i + 1}
                      </span>
                      <span className="text-[#E6E6E6] truncate">{act.description}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApplyActionGroup(pendingActionGroup)}
                    className="flex-1 py-1.5 rounded-lg bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Áp dụng (Apply)
                  </button>
                  <button
                    onClick={() => setPendingActionGroup(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#333333] hover:bg-[#444444] text-[#E6E6E6] font-semibold text-xs transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="p-2.5 rounded-xl bg-[#262626] border border-[#333333] text-[#1FC8DB] text-xs self-start flex items-center gap-2 shadow">
                <Zap className="w-3.5 h-3.5 animate-spin" />
                <span>EditPilot đang phân tích lệnh và cấu trúc timeline...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Gợi Ý Chips */}
          <div className="px-3 py-2 border-t border-[#333333] bg-[#1F1F1F] flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] text-[#8A8A8A] font-bold uppercase tracking-wider">Gợi ý nhanh:</span>
            <div className="flex flex-nowrap overflow-x-auto gap-1.5 pb-1 scrollbar-none">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleExecutePrompt(chip)}
                  className="px-2.5 py-1 rounded-md bg-[#262626] hover:bg-[#2E2E2E] text-[#1FC8DB] text-[10px] font-semibold border border-[#333333] hover:border-[#1FC8DB] whitespace-nowrap transition-all"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) handleExecutePrompt(input.trim());
            }}
            className="p-3 bg-[#1F1F1F] border-t border-[#333333] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedClip
                  ? `Ra lệnh cho "${selectedClip.name}" (VD: cắt 5s đầu, tăng tốc 2x)...`
                  : 'VD: cắt 5 giây đầu, chia clip tại 00:10, tăng tốc 2x, làm sáng...'
              }
              className="flex-1 bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-xl px-3.5 py-2 text-xs text-[#E6E6E6] placeholder-[#8A8A8A] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="p-2.5 rounded-xl bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold shadow hover-lift transition-all"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
