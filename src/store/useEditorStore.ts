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

export interface ToastState {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface EditorState {
  // Settings & Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  
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
        projectTitle: state.projectTitle
      })
    }
  )
);

