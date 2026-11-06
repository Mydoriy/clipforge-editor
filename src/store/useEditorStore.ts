import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../i18n';
import { db } from '../db';

import {
  type Project,
  type ProjectSettings,
  type Timeline,
  type Track,
  type Clip,
  type MediaItem,
  createDefaultProjectSettings,
  createDefaultTimeline,
  createClip
} from '../types/project';

export * from '../types/project';
export type TimelineClip = Clip;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: 'feature' | 'tip' | 'export';
}

export interface AppSettings {
  defaultResolution: '720p' | '1080p' | '4k';
  defaultFps: 24 | 30 | 60;
  defaultAspect: '9:16' | '16:9' | '1:1';
  autosave: boolean;
  aiApiKey: string;
  showMascot?: boolean;
  customShortcuts?: Record<string, string>;
}

export interface ToastState {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface EditorState {
  // Settings & Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  
  // Auth & Pro state
  user: UserProfile | null;
  signIn: (name: string, email: string) => void;
  signOut: () => void;
  isPro: boolean;
  setIsPro: (val: boolean) => void;

  // Notifications
  notifications: AppNotification[];
  markAllNotificationsAsRead: () => void;
  addNotification: (notif: AppNotification) => void;

  // Autosave status
  autosaveStatus: 'idle' | 'saving' | 'saved';
  setAutosaveStatus: (status: 'idle' | 'saving' | 'saved') => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Responsive Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modals & UI overlays
  activeModal: string | null;
  openModal: (modal: string) => void;
  closeModal: () => void;
  
  // Notifications
  toasts: ToastState[];
  showToast: (message: string, type?: ToastState['type']) => void;
  removeToast: (id: string) => void;

  // Editor View State & Formal Project Model
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  projectTitle: string;
  setProjectTitle: (title: string) => void;

  project: Project | null;
  setProject: (project: Project | null) => void;
  projectSettings: ProjectSettings;
  updateProjectSettings: (updates: Partial<ProjectSettings>) => void;
  timelines: Timeline[];
  setTimelines: (timelines: Timeline[]) => void;
  activeTimelineId: string;
  setActiveTimelineId: (id: string) => void;
  mediaItems: MediaItem[];
  setMediaItems: (items: MediaItem[]) => void;
  addMediaItem: (item: MediaItem) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  safeZoneEnabled: boolean;
  toggleSafeZone: () => void;

  // Playback & Canvas
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (dur: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Selected Item
  selectedClipId: string | null;
  selectedClipIds: string[];
  selectClip: (id: string | null, multi?: boolean) => void;
  setSelectedClipIds: (ids: string[]) => void;

  // Timeline Clips
  clips: TimelineClip[];
  setClips: (clips: TimelineClip[]) => void;
  addClip: (clip: Partial<TimelineClip>) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  updateClipDraft: (id: string, updates: Partial<TimelineClip>) => void;
  commitHistorySnapshot: () => void;
  deleteClip: (id: string) => void;
  splitClip: (id: string, atTime: number) => void;
  duplicateClip: (id: string) => void;
  trimClipStart: (id: string, newStart: number) => void;
  trimClipEnd: (id: string, newEnd: number) => void;

  // Proxy 480p Mode
  isProxyEnabled: boolean;
  toggleProxy: () => void;

  // Timeline Zoom
  timelineZoom: number;
  setTimelineZoom: (zoom: number) => void;

  // Layout Management (Top bar layout presets & panels)
  panelTopHeight: number;
  panelLeftWidth: number;
  panelRightWidth: number;
  showDetails: boolean;
  showTimeline: boolean;
  layoutPreset: 'default' | 'media-focus' | 'timeline-focus' | 'large-player' | 'hide-details';
  setLayoutPreset: (preset: 'default' | 'media-focus' | 'timeline-focus' | 'large-player' | 'hide-details') => void;
  setPanelDimensions: (dims: { top?: number; left?: number; right?: number }) => void;
  setShowDetails: (show: boolean) => void;
  toggleShowDetails: () => void;
  setShowTimeline: (show: boolean) => void;
  toggleShowTimeline: () => void;
  resetLayout: () => void;

  // Clipboard & Selection (Edit Menu)
  clipboardClip: TimelineClip | null;
  cutClip: () => void;
  copyClip: () => void;
  pasteClip: () => void;
  selectAllClips: () => void;
  deselectAllClips: () => void;

  // EditPilot Drawer & Chat
  editPilotOpen: boolean;
  setEditPilotOpen: (open: boolean) => void;
  toggleEditPilot: () => void;
  chatHistory: Record<string, Array<{ id: string; role: 'user' | 'assistant'; text: string; time: string }>>;
  addChatMessage: (projectId: string, role: 'user' | 'assistant', text: string) => void;

  // History
  undoStack: TimelineClip[][];
  redoStack: TimelineClip[][];
  undo: () => void;
  redo: () => void;

  // Shortcuts & Snapping
  rebindShortcut: (id: string, newKey: string) => void;
  resetShortcuts: () => void;
  snapEnabled: boolean;
  toggleSnap: () => void;
  setSnapEnabled: (val: boolean) => void;

  // Media Relinking & Storage Quota
  relinkClipMedia: (clipId: string, file: File | Blob) => Promise<void>;
  storageWarning: string | null;
  setStorageWarning: (warn: string | null) => void;
  checkStorageQuota: () => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      language: (localStorage.getItem('clipforge_lang') as Language) || 'VN',
      setLanguage: (lang) => {
        localStorage.setItem('clipforge_lang', lang);
        set({ language: lang });
      },

      editPilotOpen: false,
      setEditPilotOpen: (open) => set({ editPilotOpen: open }),
      toggleEditPilot: () => set((state) => ({ editPilotOpen: !state.editPilotOpen })),
      chatHistory: {},
      addChatMessage: (projectId, role, text) => {
        const id = 'msg-' + Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => {
          const currentList = state.chatHistory[projectId] || [];
          return {
            chatHistory: {
              ...state.chatHistory,
              [projectId]: [...currentList, { id, role, text, time }]
            }
          };
        });
      },

      user: null,
      isPro: (localStorage.getItem('clipforge_pro') === 'true'),
      setIsPro: (val) => {
        localStorage.setItem('clipforge_pro', val ? 'true' : 'false');
        set({ isPro: val });
      },

      notifications: [
        {
          id: 'notif-1',
          title: 'Ra mắt CapCut Desktop Web v3.0!',
          desc: 'Trải nghiệm chỉnh sửa video dọc 9:16 mượt mà với Dexie IndexedDB và FFmpeg.wasm.',
          time: 'Vừa xong',
          read: false,
          type: 'feature'
        },
        {
          id: 'notif-2',
          title: 'Mẹo tăng tương tác TikTok',
          desc: 'Chèn Hook 3 giây đầu để giữ chân người xem vượt 80% tỷ lệ lướt qua.',
          time: '15 phút trước',
          read: false,
          type: 'tip'
        },
        {
          id: 'notif-3',
          title: 'Xuất video hoàn tất',
          desc: 'Video 9:16 đã được render thành công ở độ phân giải 1080p 30fps.',
          time: '1 giờ trước',
          read: false,
          type: 'export'
        }
      ],
      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true }))
        }));
      },
      addNotification: (notif) => {
        set((state) => ({
          notifications: [notif, ...state.notifications]
        }));
      },

      autosaveStatus: 'idle',
      setAutosaveStatus: (status) => set({ autosaveStatus: status }),

      settings: {
        defaultResolution: '1080p',
        defaultFps: 30,
        defaultAspect: '9:16',
        autosave: true,
        aiApiKey: localStorage.getItem('clipforge_ai_key') || '',
        showMascot: true
      },
      updateSettings: (updates) => {
        set((state) => {
          const newSettings = { ...state.settings, ...updates };
          if (updates.aiApiKey !== undefined) {
            localStorage.setItem('clipforge_ai_key', updates.aiApiKey);
          }
          return { settings: newSettings };
        });
      },

      signIn: (name, email) => {
        set({
          user: {
            id: 'usr-' + Date.now(),
            name,
            email,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
            isPro: true
          }
        });
      },
      signOut: () => set({ user: null }),

      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      activeModal: null,
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),

      toasts: [],
      showToast: (message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 3200);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      projectTitle: '0917 - Vertical Studio',
      setProjectTitle: (title) => set({ projectTitle: title }),

      project: null,
      setProject: (project) => set({ project }),
      projectSettings: createDefaultProjectSettings(),
      updateProjectSettings: (updates) =>
        set((state) => ({ projectSettings: { ...state.projectSettings, ...updates } })),
      timelines: [createDefaultTimeline()],
      setTimelines: (timelines) => set({ timelines }),
      activeTimelineId: 'timeline-main',
      setActiveTimelineId: (id) => set({ activeTimelineId: id }),
      mediaItems: [],
      setMediaItems: (mediaItems) => set({ mediaItems }),
      addMediaItem: (item) => set((state) => ({ mediaItems: [...state.mediaItems, item] })),

      activeTab: 'Media',
      setActiveTab: (tab) => set({ activeTab: tab }),

      safeZoneEnabled: true,
      toggleSafeZone: () => set((state) => ({ safeZoneEnabled: !state.safeZoneEnabled })),

      currentTime: 0,
      setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
      duration: 15,
      setDuration: (dur) => set({ duration: Math.max(1, dur) }),
      isPlaying: false,
      setIsPlaying: (playing) => set({ isPlaying: playing }),

      selectedClipId: 'clip-1',
      selectedClipIds: ['clip-1'],
      selectClip: (id, multi) => {
        if (!id) {
          set({ selectedClipId: null, selectedClipIds: [] });
          return;
        }
        if (multi) {
          const current = get().selectedClipIds || [];
          const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];
          set({
            selectedClipId: next.length > 0 ? next[next.length - 1] : null,
            selectedClipIds: next
          });
        } else {
          set({ selectedClipId: id, selectedClipIds: [id] });
        }
      },
      setSelectedClipIds: (ids) => {
        set({
          selectedClipIds: ids,
          selectedClipId: ids.length > 0 ? ids[ids.length - 1] : null
        });
      },

      clips: [
        createClip({
          id: 'clip-1',
          track: 'video',
          name: 'Video Clip 1 (9:16 Vertical)',
          start: 0,
          duration: 15,
          type: 'video',
          scale: 1,
          opacity: 1
        }),
        createClip({
          id: 'clip-2',
          track: 'text',
          name: 'HOOK: Đừng bỏ lỡ!',
          start: 0,
          duration: 4,
          type: 'text',
          text: '🔥 3 BÍ QUYẾT TĂNG TƯƠNG TÁC',
          scale: 1,
          y: -120,
          opacity: 1
        }),
        createClip({
          id: 'clip-3',
          track: 'audio',
          name: 'Viral Lo-Fi Chill Beat',
          start: 0,
          duration: 15,
          type: 'audio',
          volume: 0.8
        })
      ],
      setClips: (clips) => set({ clips }),
      addClip: (clipData) => {
        const newClip = createClip(clipData);
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: [...currentClips, newClip],
          selectedClipId: newClip.id
        });
      },
      updateClip: (id, updates) => {
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: currentClips.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...updates };
            if (updates.x !== undefined || updates.y !== undefined || updates.scale !== undefined || updates.rotation !== undefined) {
              updated.transform = {
                ...c.transform,
                x: updates.x ?? c.transform?.x ?? 0,
                y: updates.y ?? c.transform?.y ?? 0,
                scale: updates.scale ?? c.transform?.scale ?? 1,
                rotation: updates.rotation ?? c.transform?.rotation ?? 0
              };
            }
            if (updates.transform) {
              updated.x = updates.transform.x;
              updated.y = updates.transform.y;
              updated.scale = updates.transform.scale;
              updated.rotation = updates.transform.rotation;
            }
            return updated;
          })
        });
      },
      updateClipDraft: (id, updates) => {
        set((state) => ({
          clips: state.clips.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...updates };
            if (updates.x !== undefined || updates.y !== undefined || updates.scale !== undefined || updates.rotation !== undefined) {
              updated.transform = {
                ...c.transform,
                x: updates.x ?? c.transform?.x ?? 0,
                y: updates.y ?? c.transform?.y ?? 0,
                scale: updates.scale ?? c.transform?.scale ?? 1,
                rotation: updates.rotation ?? c.transform?.rotation ?? 0
              };
            }
            if (updates.transform) {
              updated.x = updates.transform.x;
              updated.y = updates.transform.y;
              updated.scale = updates.transform.scale;
              updated.rotation = updates.transform.rotation;
            }
            return updated;
          })
        }));
      },
      commitHistorySnapshot: () => {
        const currentClips = get().clips;
        set((state) => ({
          undoStack: [...state.undoStack, currentClips].slice(-100),
          redoStack: []
        }));
      },
      deleteClip: (id) => {
        const currentClips = get().clips;
        const targetIds = get().selectedClipIds.includes(id) && get().selectedClipIds.length > 1
          ? get().selectedClipIds
          : [id];
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: currentClips.filter((c) => !targetIds.includes(c.id)),
          selectedClipId: null,
          selectedClipIds: []
        });
      },
      splitClip: (id, atTime) => {
        const clip = get().clips.find((c) => c.id === id);
        if (!clip || atTime <= clip.start || atTime >= clip.start + clip.duration) return;
        const firstDuration = atTime - clip.start;
        const secondDuration = clip.duration - firstDuration;

        const part1: TimelineClip = { ...clip, duration: firstDuration };
        const part2: TimelineClip = {
          ...clip,
          id: 'clip-' + Date.now(),
          start: atTime,
          duration: secondDuration,
          name: `${clip.name} (Part 2)`
        };

        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: currentClips.map((c) => (c.id === id ? part1 : c)).concat(part2),
          selectedClipId: part2.id
        });
      },
      duplicateClip: (id) => {
        const clip = get().clips.find((c) => c.id === id);
        if (!clip) return;
        const newClip: TimelineClip = {
          ...clip,
          id: 'clip-' + Date.now(),
          name: `${clip.name} (Copy)`,
          start: clip.start + clip.duration
        };
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: [...currentClips, newClip],
          selectedClipId: newClip.id
        });
        if (newClip.start + newClip.duration > get().duration) {
          set({ duration: Math.ceil(newClip.start + newClip.duration) });
        }
      },
      trimClipStart: (id, newStart) => {
        const clip = get().clips.find((c) => c.id === id);
        if (!clip) return;
        const currentEnd = clip.start + clip.duration;
        const clampedStart = Math.max(0, Math.min(newStart, currentEnd - 0.2));
        const newDuration = currentEnd - clampedStart;
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: currentClips.map((c) => (c.id === id ? { ...c, start: clampedStart, duration: newDuration } : c))
        });
      },
      trimClipEnd: (id, newEnd) => {
        const clip = get().clips.find((c) => c.id === id);
        if (!clip) return;
        const clampedEnd = Math.max(clip.start + 0.2, newEnd);
        const newDuration = clampedEnd - clip.start;
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips].slice(-100),
          redoStack: [],
          clips: currentClips.map((c) => (c.id === id ? { ...c, duration: newDuration } : c))
        });
        if (clampedEnd > get().duration) {
          set({ duration: Math.ceil(clampedEnd) });
        }
      },

      isProxyEnabled: false,
      toggleProxy: () => set((state) => ({ isProxyEnabled: !state.isProxyEnabled })),

      timelineZoom: 1,
      setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.5, Math.min(3, zoom)) }),

      // Layout states & actions
      panelTopHeight: parseFloat(localStorage.getItem('clipforge_panel_top_height') || '50'),
      panelLeftWidth: parseFloat(localStorage.getItem('clipforge_panel_left_width') || '34'),
      panelRightWidth: parseFloat(localStorage.getItem('clipforge_panel_right_width') || '32'),
      showDetails: true,
      showTimeline: true,
      layoutPreset: 'default',
      setLayoutPreset: (preset) => {
        let top = 50;
        let left = 34;
        let right = 32;
        let showDet = true;
        let showTl = true;

        switch (preset) {
          case 'media-focus':
            top = 55;
            left = 48;
            right = 24;
            break;
          case 'timeline-focus':
            top = 35;
            left = 34;
            right = 32;
            break;
          case 'large-player':
            top = 60;
            left = 24;
            right = 24;
            break;
          case 'hide-details':
            top = 50;
            left = 34;
            right = 32;
            showDet = false;
            break;
          case 'default':
          default:
            top = 50;
            left = 34;
            right = 32;
            break;
        }

        localStorage.setItem('clipforge_panel_top_height', top.toString());
        localStorage.setItem('clipforge_panel_left_width', left.toString());
        localStorage.setItem('clipforge_panel_right_width', right.toString());

        set({
          layoutPreset: preset,
          panelTopHeight: top,
          panelLeftWidth: left,
          panelRightWidth: right,
          showDetails: showDet,
          showTimeline: showTl
        });
      },
      setPanelDimensions: (dims) => {
        set((state) => {
          const top = dims.top !== undefined ? dims.top : state.panelTopHeight;
          const left = dims.left !== undefined ? dims.left : state.panelLeftWidth;
          const right = dims.right !== undefined ? dims.right : state.panelRightWidth;
          if (dims.top !== undefined) localStorage.setItem('clipforge_panel_top_height', top.toString());
          if (dims.left !== undefined) localStorage.setItem('clipforge_panel_left_width', left.toString());
          if (dims.right !== undefined) localStorage.setItem('clipforge_panel_right_width', right.toString());
          return { panelTopHeight: top, panelLeftWidth: left, panelRightWidth: right };
        });
      },
      setShowDetails: (show) => set({ showDetails: show }),
      toggleShowDetails: () => set((state) => ({ showDetails: !state.showDetails })),
      setShowTimeline: (show) => set({ showTimeline: show }),
      toggleShowTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
      resetLayout: () => {
        localStorage.setItem('clipforge_panel_top_height', '50');
        localStorage.setItem('clipforge_panel_left_width', '34');
        localStorage.setItem('clipforge_panel_right_width', '32');
        set({
          panelTopHeight: 50,
          panelLeftWidth: 34,
          panelRightWidth: 32,
          showDetails: true,
          showTimeline: true,
          layoutPreset: 'default'
        });
      },

      // Clipboard & Selection
      clipboardClip: null,
      cutClip: () => {
        const { selectedClipId, clips, undoStack } = get();
        if (!selectedClipId) return;
        const target = clips.find((c) => c.id === selectedClipId);
        if (!target) return;
        set({
          clipboardClip: target,
          undoStack: [...undoStack, clips].slice(-100),
          redoStack: [],
          clips: clips.filter((c) => c.id !== selectedClipId),
          selectedClipId: null
        });
        get().showToast('Đã cắt clip (Ctrl+X)', 'info');
      },
      copyClip: () => {
        const { selectedClipId, clips } = get();
        if (!selectedClipId) return;
        const target = clips.find((c) => c.id === selectedClipId);
        if (!target) return;
        set({ clipboardClip: target });
        get().showToast('Đã sao chép clip (Ctrl+C)', 'info');
      },
      pasteClip: () => {
        const { clipboardClip, currentTime, clips, undoStack, duration } = get();
        if (!clipboardClip) {
          get().showToast('Clipboard trống', 'warning');
          return;
        }
        const pasted: TimelineClip = {
          ...clipboardClip,
          id: 'clip-' + Date.now(),
          start: currentTime,
          name: `${clipboardClip.name} (Paste)`
        };
        const updated = [...clips, pasted];
        set({
          undoStack: [...undoStack, clips].slice(-100),
          redoStack: [],
          clips: updated,
          selectedClipId: pasted.id
        });
        if (pasted.start + pasted.duration > duration) {
          set({ duration: Math.ceil(pasted.start + pasted.duration) });
        }
        get().showToast('Đã dán clip tại con trỏ (Ctrl+V)', 'success');
      },
      selectAllClips: () => {
        const { clips } = get();
        if (clips.length > 0) {
          set({
            selectedClipId: clips[0].id,
            selectedClipIds: clips.map((c) => c.id)
          });
          get().showToast(`Đã chọn tất cả ${clips.length} clip (Ctrl+A)`, 'info');
        }
      },
      deselectAllClips: () => {
        set({ selectedClipId: null, selectedClipIds: [] });
      },

      undoStack: [],
      redoStack: [],
      undo: () => {
        const { undoStack, clips, redoStack } = get();
        if (undoStack.length === 0) return;
        const previous = undoStack[undoStack.length - 1];
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, clips],
          clips: previous
        });
      },
      redo: () => {
        const { undoStack, clips, redoStack } = get();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        set({
          redoStack: redoStack.slice(0, -1),
          undoStack: [...undoStack, clips],
          clips: next
        });
      },

      rebindShortcut: (id, newKey) => {
        set((state) => {
          const customShortcuts = { ...(state.settings.customShortcuts || {}), [id]: newKey };
          return { settings: { ...state.settings, customShortcuts } };
        });
      },
      resetShortcuts: () => {
        set((state) => ({ settings: { ...state.settings, customShortcuts: {} } }));
      },

      snapEnabled: true,
      toggleSnap: () => {
        set((state) => {
          const next = !state.snapEnabled;
          get().showToast(next ? 'Hút tự động (Snapping): BẬT' : 'Hút tự động (Snapping): TẮT', 'info');
          return { snapEnabled: next };
        });
      },
      setSnapEnabled: (val) => set({ snapEnabled: val }),

      storageWarning: null,
      setStorageWarning: (warn) => set({ storageWarning: warn }),
      checkStorageQuota: async () => {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
          try {
            const estimate = await navigator.storage.estimate();
            if (estimate.quota && estimate.usage) {
              const ratio = estimate.usage / estimate.quota;
              if (ratio >= 0.9) {
                const usedMb = (estimate.usage / (1024 * 1024)).toFixed(0);
                const totalMb = (estimate.quota / (1024 * 1024)).toFixed(0);
                const msg = `Bộ nhớ trình duyệt gần đầy (${usedMb}MB / ${totalMb}MB, ${(ratio * 100).toFixed(0)}%). Hãy xóa bớt dự án cũ hoặc sao lưu .capproj để tránh mất dữ liệu!`;
                set({ storageWarning: msg });
              } else {
                set({ storageWarning: null });
              }
            }
          } catch (e) {
            console.warn('Storage estimate failed:', e);
          }
        }
      },

      relinkClipMedia: async (clipId: string, file: File | Blob) => {
        const { clips, updateClip, showToast } = get();
        const target = clips.find((c) => c.id === clipId);
        if (!target) return;

        try {
          const blobUrl = URL.createObjectURL(file);
          const mediaId = target.mediaId || 'media-' + Date.now();
          const fileName = (file as File).name || target.name || 'relinked_media';

          try {
            await db.media.put({
              id: mediaId,
              name: fileName,
              type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
              blob: file,
              size: file.size,
              createdAt: Date.now()
            });
          } catch (dbErr) {
            console.warn('IndexedDB put relink media error:', dbErr);
          }

          updateClip(clipId, {
            src: blobUrl,
            mediaId,
            name: fileName,
            hasError: false,
            missingMedia: false
          });

          showToast(`Đã kết nối lại tệp cho "${target.name || 'clip'}"!`, 'success');
        } catch (err: any) {
          showToast(`Lỗi kết nối lại tệp: ${err.message}`, 'error');
        }
      }
    }),
    {
      name: 'clipforge_editor_v1',
      partialize: (state) => ({
        language: state.language,
        safeZoneEnabled: state.safeZoneEnabled,
        projectTitle: state.projectTitle,
        user: state.user,
        isPro: state.isPro,
        settings: state.settings,
        chatHistory: state.chatHistory
      })
    }
  )
);

