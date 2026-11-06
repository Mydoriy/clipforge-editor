import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../i18n';

export interface TimelineClip {
  id: string;
  track: 'video' | 'audio' | 'text' | 'sticker' | 'effect';
  name: string;
  start: number; // in seconds
  duration: number; // in seconds
  type: string;
  src?: string;
  text?: string;
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  speed?: number;
  volume?: number;
  filter?: string;
  particleType?: string;
}

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

  // Editor View State
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  projectTitle: string;
  setProjectTitle: (title: string) => void;

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
  selectClip: (id: string | null) => void;

  // Timeline Clips
  clips: TimelineClip[];
  setClips: (clips: TimelineClip[]) => void;
  addClip: (clip: Omit<TimelineClip, 'id'>) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  deleteClip: (id: string) => void;
  splitClip: (id: string, atTime: number) => void;

  // History
  undoStack: TimelineClip[][];
  redoStack: TimelineClip[][];
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      language: (localStorage.getItem('clipforge_lang') as Language) || 'VN',
      setLanguage: (lang) => {
        localStorage.setItem('clipforge_lang', lang);
        set({ language: lang });
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

      settings: {
        defaultResolution: '1080p',
        defaultFps: 30,
        defaultAspect: '9:16',
        autosave: true,
        aiApiKey: localStorage.getItem('clipforge_ai_key') || ''
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
      selectClip: (id) => set({ selectedClipId: id }),

      clips: [
        {
          id: 'clip-1',
          track: 'video',
          name: 'Video Clip 1 (9:16 Vertical)',
          start: 0,
          duration: 15,
          type: 'video',
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          speed: 1,
          volume: 1,
          filter: 'none'
        },
        {
          id: 'clip-2',
          track: 'text',
          name: 'HOOK: Đừng bỏ lỡ!',
          start: 0,
          duration: 4,
          type: 'text',
          text: '🔥 3 BÍ QUYẾT TĂNG TƯƠNG TÁC',
          scale: 1,
          x: 0,
          y: -120,
          rotation: 0,
          opacity: 1
        },
        {
          id: 'clip-3',
          track: 'audio',
          name: 'Viral Lo-Fi Chill Beat',
          start: 0,
          duration: 15,
          type: 'audio',
          volume: 0.8
        }
      ],
      setClips: (clips) => set({ clips }),
      addClip: (clipData) => {
        const id = 'clip-' + Date.now();
        const newClip: TimelineClip = {
          id,
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          speed: 1,
          volume: 1,
          ...clipData
        };
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips],
          redoStack: [],
          clips: [...currentClips, newClip],
          selectedClipId: id
        });
      },
      updateClip: (id, updates) => {
        set((state) => ({
          clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c))
        }));
      },
      deleteClip: (id) => {
        const currentClips = get().clips;
        set({
          undoStack: [...get().undoStack, currentClips],
          redoStack: [],
          clips: currentClips.filter((c) => c.id !== id),
          selectedClipId: null
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
          undoStack: [...get().undoStack, currentClips],
          redoStack: [],
          clips: currentClips.map((c) => (c.id === id ? part1 : c)).concat(part2),
          selectedClipId: part2.id
        });
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
        settings: state.settings
      })
    }
  )
);

