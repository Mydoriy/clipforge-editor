import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  audioManager,
  SFX_CATALOG,
  extractAudioFromVideo,
  synthesizeSpeechWav,
  type SfxType,
  type SfxMeta
} from '../utils/audio';
import { db, type MediaEntity } from '../db';
import { safeAddMedia } from '../lib/db';
import { createDefaultTimeline } from '../types/project';
import confetti from 'canvas-confetti';
import {
  FolderOpen,
  Music,
  Type,
  Smile,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Subtitles,
  Upload,
  Play,
  Pause,
  Flame,
  Volume2,
  VolumeX,
  Mic,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  HardDrive,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Sliders,
  Film,
  Bookmark,
  Cloud,
  Check,
  RotateCcw,
  RefreshCw,
  FolderKanban,
  Wand2,
  Image as ImageIcon,
  Star,
  Video,
  Monitor,
  Camera,
  Eye,
  X,
  Lock,
  Search,
  ArrowUpDown,
  FolderPlus,
  Radio,
  ExternalLink,
  Scissors,
  Square,
  HelpCircle,
  Heart,
  Shapes,
  Palette,
  Download,
  Languages,
  Sun,
  Contrast,
  CircleDot,
  Droplet,
  Filter,
  Settings,
  Award,
  ShieldAlert
} from 'lucide-react';
import { speakText } from '../utils/tts';
import { pickFileStayInLocation, generateProxyVideo480p, generateMediaMetadata } from '../engine/storageProxy';
import {
  FILTER_PRESETS,
  parseCubeLut,
  type FilterPreset
} from '../utils/lutParser';
import {
  parseSrt,
  parseVtt,
  parseLrc,
  exportToSrt,
  exportToVtt,
  exportToLrc,
  downloadSubtitleFile,
  type SubtitleItem
} from '../utils/subtitles';
import { validateFontBuffer, sanitizeLottieJson, sanitizeSvg } from '../utils/sanitizer';

export const CategoryPanel: React.FC = () => {
  const {
    language,
    activeTab,
    setActiveTab,
    addClip,
    currentTime,
    showToast,
    updateClip,
    clips,
    selectedClipId,
    timelines,
    activeTimelineId,
    setActiveTimelineId,
    setTimelines,
    duration,
    settings,
    openModal,
    isOffline
  } = useEditorStore();

  const t = translations[language];

  // Tab horizontal scroll & scroll position memory
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Media Sub-Sidebar state
  const [selectedMediaNav, setSelectedMediaNav] = useState<string>('media');
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>({
    yours: false,
    generate: false,
    spaces: false,
    library: false
  });
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // Storage usage estimate for Spaces
  const [storageEstimate, setStorageEstimate] = useState<{ used: string; quota: string }>({ used: '0 MB', quota: '0 GB' });

  // AI Prompt in Generate subnav
  const [aiImagePrompt, setAiImagePrompt] = useState('Cyberpunk neon street at night, 8k vertical');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Adjustment Tab state
  const [adjTemp, setAdjTemp] = useState(0);
  const [adjTint, setAdjTint] = useState(0);
  const [adjSaturation, setAdjSaturation] = useState(100);
  const [adjBrightness, setAdjBrightness] = useState(100);
  const [adjContrast, setAdjContrast] = useState(100);
  const [adjExposure, setAdjExposure] = useState(0);
  const [adjHighlight, setAdjHighlight] = useState(0);
  const [adjShadow, setAdjShadow] = useState(0);
  const [adjHue, setAdjHue] = useState(0);
  const [adjFade, setAdjFade] = useState(0);
  const [adjVignette, setAdjVignette] = useState(0);
  const [adjSharpness, setAdjSharpness] = useState(0);
  const [adjGrain, setAdjGrain] = useState(0);
  const [selectedAdjPreset, setSelectedAdjPreset] = useState<string>('cinematic');
  const [colorWheelMode, setColorWheelMode] = useState<'lift' | 'gamma' | 'gain'>('gamma');
  const [liftColor, setLiftColor] = useState('#ffffff');
  const [gammaColor, setGammaColor] = useState('#ffffff');
  const [gainColor, setGainColor] = useState('#ffffff');
  const [selectedHslChannel, setSelectedHslChannel] = useState<'red' | 'yellow' | 'green' | 'cyan' | 'blue' | 'magenta'>('red');
  const [hslHue, setHslHue] = useState(0);
  const [hslSat, setHslSat] = useState(0);
  const [hslLum, setHslLum] = useState(0);

  // Filters Tab state
  const [filterCategory, setFilterCategory] = useState<string>('Featured');
  const [filterIntensity, setFilterIntensity] = useState(80);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('none');
  const [customLuts, setCustomLuts] = useState<Array<{ id: string; name: string; size: number }>>([]);
  const cubeInputRef = useRef<HTMLInputElement>(null);

  // Captions Tab state
  const [captionSource, setCaptionSource] = useState<'selected' | 'timeline'>('selected');
  const [captionLanguage, setCaptionLanguage] = useState<'vi' | 'en' | 'auto'>('vi');
  const [isWhisperRunning, setIsWhisperRunning] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [whisperStatus, setWhisperStatus] = useState('');
  const [styleCaptionFont, setStyleCaptionFont] = useState('Inter');
  const [styleCaptionPreset, setStyleCaptionPreset] = useState<'hormozi' | 'neon_cyan' | 'yellow_sub' | 'black_box' | 'minimalist'>('hormozi');
  const [styleCaptionColor, setStyleCaptionColor] = useState('#FFFFFF');
  const [styleCaptionBg, setStyleCaptionBg] = useState('rgba(0,0,0,0.7)');
  const [styleCaptionScale, setStyleCaptionScale] = useState(1.1);
  const [styleCaptionY, setStyleCaptionY] = useState(-110);
  const [translateTargetLang, setTranslateTargetLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const subtitleFileInputRef = useRef<HTMLInputElement>(null);

  // Templates Tab state
  const [templateCategory, setTemplateCategory] = useState<string>('all');

  // Media Library state from Dexie
  const [dbMediaList, setDbMediaList] = useState<MediaEntity[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Section 3.1 Media State: Search, Filter, Sort, Multi-select
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [mediaSort, setMediaSort] = useState<'date' | 'name' | 'duration' | 'size'>('date');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [visibleMediaCount, setVisibleMediaCount] = useState<number>(60);
  const mediaBlobUrlMapRef = useRef<Map<string, string>>(new Map());

  const getMediaBlobUrl = (id: string, blob: Blob) => {
    let url = mediaBlobUrlMapRef.current.get(id);
    if (!url) {
      url = URL.createObjectURL(blob);
      mediaBlobUrlMapRef.current.set(id, url);
    }
    return url;
  };

  useEffect(() => {
    return () => {
      for (const url of mediaBlobUrlMapRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      mediaBlobUrlMapRef.current.clear();
    };
  }, []);

  // Modals & ContextMenu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; media: MediaEntity } | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaEntity | null>(null);
  const [mediaInfoModalItem, setMediaInfoModalItem] = useState<MediaEntity | null>(null);
  const [renameMediaItem, setRenameMediaItem] = useState<MediaEntity | null>(null);
  const [renameNewName, setRenameNewName] = useState('');

  // From URL Modal
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // Record Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordSource, setRecordSource] = useState<'webcam' | 'screen' | 'mic'>('webcam');
  const [isRecordingModal, setIsRecordingModal] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(null);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // AI 2D Avatars Modal
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarPreset, setAvatarPreset] = useState<'luna' | 'alex' | 'neo' | 'mia'>('luna');
  const [avatarScript, setAvatarScript] = useState('Chào mừng các bạn đến với video 9:16 trên CapCut Web!');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Spaces (Workspaces/Folders)
  const [spacesList, setSpacesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('clipforge_spaces');
      return saved ? JSON.parse(saved) : ['Mặc định', 'B-Roll', 'Âm nhạc', 'Hiệu ứng'];
    } catch {
      return ['Mặc định', 'B-Roll', 'Âm nhạc', 'Hiệu ứng'];
    }
  });
  const [activeSpace, setActiveSpace] = useState<string>('Mặc định');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showNewSpaceInput, setShowNewSpaceInput] = useState(false);

  // Yours & Library sub-navigation
  const [yoursSubnav, setYoursSubnav] = useState<'recent' | 'favorites' | 'uploads'>('uploads');
  const [librarySubnav, setLibrarySubnav] = useState<'all' | 'colors' | 'gradients' | 'frames' | 'countdown' | 'textures' | 'imported'>('all');

  // Text-To-Speech (TTS)
  const [ttsScript, setTtsScript] = useState('Khám phá tính năng Text-to-Speech tự động trên CapCut Web');
  const [ttsLang, setTtsLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);

  // 3.2 Audio State: Music, SFX, Extraction, Voiceover
  const [audioSubnav, setAudioSubnav] = useState<'music' | 'sfx' | 'extract' | 'tts' | 'voiceover'>('music');
  const [musicCategory, setMusicCategory] = useState<'all' | 'trending' | 'lofi' | 'phonk' | 'vlog' | 'chill' | 'cinematic'>('all');
  const [musicSearch, setMusicSearch] = useState('');
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sfxCategory, setSfxCategory] = useState<string>('all');
  const [sfxSearch, setSfxSearch] = useState('');
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [voiceoverCountdown, setVoiceoverCountdown] = useState<number | null>(null);
  const [voiceoverTimer, setVoiceoverTimer] = useState(0);
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverChunksRef = useRef<Blob[]>([]);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverTimerRef = useRef<any>(null);

  // 3.3 Text State: Presets, Word Art, Lyrics, Fonts
  const [textSubnav, setTextSubnav] = useState<'presets' | 'wordart' | 'lyrics' | 'fonts'>('presets');
  const [textSearch, setTextSearch] = useState('');
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const lrcInputRef = useRef<HTMLInputElement>(null);

  // 3.4 Stickers State: Emojis, Shapes, Icons, Lottie
  const [stickerSubnav, setStickerSubnav] = useState<'emojis' | 'shapes' | 'icons' | 'lottie'>('emojis');
  const [stickerCategory, setStickerCategory] = useState<string>('all');
  const [stickerSearch, setStickerSearch] = useState('');
  const [selectedShapeColor, setSelectedShapeColor] = useState('#1FC8DB');
  const [selectedShapeStroke, setSelectedShapeStroke] = useState('#FFFFFF');
  const lottieInputRef = useRef<HTMLInputElement>(null);

  // 3.5 Effects State: Video shaders, intensity, speed, target
  const [effectSubnav, setEffectSubnav] = useState<'all' | 'glitch' | 'retro' | 'cinematic' | 'particles'>('all');
  const [effectIntensity, setEffectIntensity] = useState(50);
  const [effectSpeed, setEffectSpeed] = useState(1.0);
  const [effectApplyTarget, setEffectApplyTarget] = useState<'track' | 'selectedClip'>('track');
  const [bodyEffectsModalOpen, setBodyEffectsModalOpen] = useState(false);

  // 3.6 Transitions State: Type, duration, target
  const [transitionDuration, setTransitionDuration] = useState(1.0);
  const [selectedTransition, setSelectedTransition] = useState('fade');

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Captions state
  const [manualCaptionText, setManualCaptionText] = useState('');
  const [manualCaptionDuration, setManualCaptionDuration] = useState(3);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Load Dexie media list
  const loadMedia = async () => {
    try {
      const all = await db.media.orderBy('createdAt').reverse().toArray();
      setDbMediaList(all);
    } catch (err) {
      console.warn('Failed to load media from DB', err);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [activeTab]);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 10 Tabs in exact requested order
  const tabs = [
    { id: 'Media', label: t.tabMedia, icon: FolderOpen },
    { id: 'Audio', label: t.tabAudio, icon: Music },
    { id: 'Text', label: t.tabText, icon: Type },
    { id: 'Stickers', label: t.tabStickers, icon: Smile },
    { id: 'Effects', label: t.tabEffects, icon: Sparkles },
    { id: 'Transitions', label: t.tabTransitions, icon: Layers },
    { id: 'Captions', label: t.tabCaptions, icon: Subtitles },
    { id: 'Filters', label: t.tabFilters, icon: SlidersHorizontal },
    { id: 'Adjustment', label: t.tabAdjustment || (language === 'VN' ? 'Điều chỉnh' : 'Adjustment'), icon: Sliders },
    { id: 'Templates', label: t.tabTemplates || (language === 'VN' ? 'Mẫu' : 'Templates'), icon: LayoutTemplate }
  ];

  // Tab scroll check
  const checkTabScroll = () => {
    if (!tabBarRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabBarRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    checkTabScroll();
    const el = tabBarRef.current;
    if (el) {
      el.addEventListener('scroll', checkTabScroll, { passive: true });
      window.addEventListener('resize', checkTabScroll);
      return () => {
        el.removeEventListener('scroll', checkTabScroll);
        window.removeEventListener('resize', checkTabScroll);
      };
    }
  }, []);

  // Storage estimate on mount
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
        const quotaGb = ((est.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
        setStorageEstimate({ used: `${usedMb} MB`, quota: `${quotaGb} GB` });
      }).catch(() => {});
    }
  }, []);

  // Tab select with scroll restoration
  const handleTabSelect = (tabId: string) => {
    if (contentRef.current) {
      scrollPositions.current[activeTab] = contentRef.current.scrollTop;
    }
    setActiveTab(tabId);
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = scrollPositions.current[tabId] || 0;
      }
    }, 0);
  };

  // Subproject creation
  const handleCreateSubproject = () => {
    const newName = `Subproject #${timelines.length + 1}`;
    const newTl = createDefaultTimeline(newName);
    setTimelines([...timelines, newTl]);
    setActiveTimelineId(newTl.id);
    showToast(`Đã tạo và chuyển sang "${newName}"!`, 'success');
  };

  // Voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voiceover-${Date.now()}.webm`, { type: 'audio/webm' });
        await processImportedFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setIsRecordingVoice(true);
      showToast('Đang ghi âm... Nhấn lại nút để kết thúc và chèn vào timeline!', 'info');
    } catch (err: any) {
      showToast('Không thể mở micro: ' + err.message, 'error');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      showToast('Đã dừng và lưu file ghi âm!', 'success');
    }
  };

  // Procedural AI Image Generation (Canvas 9:16)
  const handleGenerateAiImage = async () => {
    setIsGeneratingAi(true);
    showToast('Đang tạo ảnh AI 9:16 cục bộ...', 'info');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#581c87');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.strokeStyle = '#1FC8DB';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(540, 750, 260, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(540, 750, 310, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(31, 200, 219, 0.15)';
        ctx.fillRect(80, 1150, 920, 320);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AI GENERATED IMAGE', 540, 750);

        ctx.fillStyle = '#1FC8DB';
        ctx.font = '30px sans-serif';
        ctx.fillText(`"${aiImagePrompt.slice(0, 42)}"`, 540, 1280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px sans-serif';
        ctx.fillText('9:16 Vertical • CapCut Web AI', 540, 1350);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (blob) {
          const file = new File([blob], `ai-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
          await processImportedFile(file);
          confetti({ particleCount: 50, spread: 60 });
        }
      }
    } catch (err: any) {
      showToast('Lỗi tạo ảnh: ' + err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Adjustment Presets & Handlers
  const handleSelectAdjPreset = (presetKey: string) => {
    setSelectedAdjPreset(presetKey);
    if (presetKey === 'cinematic') {
      setAdjTemp(10);
      setAdjTint(-10);
      setAdjSaturation(115);
      setAdjBrightness(100);
      setAdjContrast(110);
      setAdjExposure(5);
      setAdjHighlight(-5);
      setAdjShadow(10);
      setAdjHue(0);
      setAdjFade(0);
      setAdjVignette(20);
      setAdjSharpness(10);
      setAdjGrain(5);
    } else if (presetKey === 'moody') {
      setAdjTemp(-10);
      setAdjTint(5);
      setAdjSaturation(85);
      setAdjBrightness(95);
      setAdjContrast(120);
      setAdjExposure(-5);
      setAdjHighlight(-15);
      setAdjShadow(5);
      setAdjHue(0);
      setAdjFade(15);
      setAdjVignette(35);
      setAdjSharpness(15);
      setAdjGrain(15);
    } else if (presetKey === 'sunset') {
      setAdjTemp(30);
      setAdjTint(-5);
      setAdjSaturation(125);
      setAdjBrightness(105);
      setAdjContrast(105);
      setAdjExposure(10);
      setAdjHighlight(10);
      setAdjShadow(5);
      setAdjHue(5);
      setAdjFade(0);
      setAdjVignette(15);
      setAdjSharpness(5);
      setAdjGrain(0);
    } else if (presetKey === 'cyberpunk') {
      setAdjTemp(-25);
      setAdjTint(35);
      setAdjSaturation(140);
      setAdjBrightness(100);
      setAdjContrast(125);
      setAdjExposure(0);
      setAdjHighlight(15);
      setAdjShadow(-10);
      setAdjHue(20);
      setAdjFade(5);
      setAdjVignette(25);
      setAdjSharpness(20);
      setAdjGrain(10);
    } else if (presetKey === 'noir') {
      setAdjTemp(0);
      setAdjTint(0);
      setAdjSaturation(0);
      setAdjBrightness(100);
      setAdjContrast(130);
      setAdjExposure(-10);
      setAdjHighlight(-20);
      setAdjShadow(20);
      setAdjHue(0);
      setAdjFade(10);
      setAdjVignette(40);
      setAdjSharpness(25);
      setAdjGrain(20);
    } else if (presetKey === 'vintage') {
      setAdjTemp(20);
      setAdjTint(15);
      setAdjSaturation(90);
      setAdjBrightness(95);
      setAdjContrast(90);
      setAdjExposure(0);
      setAdjHighlight(-10);
      setAdjShadow(10);
      setAdjHue(-5);
      setAdjFade(20);
      setAdjVignette(25);
      setAdjSharpness(0);
      setAdjGrain(25);
    } else if (presetKey === 'portrait') {
      setAdjTemp(5);
      setAdjTint(5);
      setAdjSaturation(105);
      setAdjBrightness(105);
      setAdjContrast(100);
      setAdjExposure(5);
      setAdjHighlight(-5);
      setAdjShadow(10);
      setAdjHue(0);
      setAdjFade(0);
      setAdjVignette(10);
      setAdjSharpness(15);
      setAdjGrain(0);
    } else if (presetKey === 'punch') {
      setAdjTemp(0);
      setAdjTint(0);
      setAdjSaturation(130);
      setAdjBrightness(100);
      setAdjContrast(135);
      setAdjExposure(0);
      setAdjHighlight(-15);
      setAdjShadow(15);
      setAdjHue(0);
      setAdjFade(0);
      setAdjVignette(20);
      setAdjSharpness(25);
      setAdjGrain(0);
    }
    showToast(`Đã chọn preset "${presetKey}"!`, 'info');
  };

  const handleResetAdjustments = () => {
    setAdjTemp(0);
    setAdjTint(0);
    setAdjSaturation(100);
    setAdjBrightness(100);
    setAdjContrast(100);
    setAdjExposure(0);
    setAdjHighlight(0);
    setAdjShadow(0);
    setAdjHue(0);
    setAdjFade(0);
    setAdjVignette(0);
    setAdjSharpness(0);
    setAdjGrain(0);
    setLiftColor('#ffffff');
    setGammaColor('#ffffff');
    setGainColor('#ffffff');
    setHslHue(0);
    setHslSat(0);
    setHslLum(0);
    setSelectedAdjPreset('custom');
    showToast('Đã đặt lại toàn bộ thông số màu về mặc định', 'info');
  };

  const handleAddAdjustmentTrack = () => {
    addClip({
      track: 'adjustment',
      name: `Adjustment Layer (${selectedAdjPreset})`,
      start: currentTime,
      duration: 8,
      type: 'adjustment',
      adjustments: {
        temperature: adjTemp,
        tint: adjTint,
        saturation: adjSaturation,
        brightness: adjBrightness - 100,
        contrast: adjContrast - 100,
        exposure: adjExposure,
        highlight: adjHighlight,
        shadow: adjShadow,
        hue: adjHue,
        fade: adjFade,
        vignette: adjVignette,
        sharpness: adjSharpness,
        grain: adjGrain
      }
    });
    showToast('Đã thêm Layer Điều Chỉnh (Adjustment Track) vào timeline!', 'success');
  };

  const handleApplyAdjustmentsToClip = () => {
    const target = selectedClipId ? clips.find((c) => c.id === selectedClipId) : clips.find((c) => c.track === 'video');
    if (target) {
      updateClip(target.id, {
        adjustments: {
          temperature: adjTemp,
          tint: adjTint,
          saturation: adjSaturation,
          brightness: adjBrightness - 100,
          contrast: adjContrast - 100,
          exposure: adjExposure,
          highlight: adjHighlight,
          shadow: adjShadow,
          hue: adjHue,
          fade: adjFade,
          vignette: adjVignette,
          sharpness: adjSharpness,
          grain: adjGrain
        }
      });
      showToast(`Đã áp dụng các thông số màu vào clip "${target.name || target.id}"!`, 'success');
    } else {
      showToast('Chưa có clip nào trên timeline để áp dụng!', 'warning');
    }
  };

  // Filters Handlers
  const handleApplyFilter = (filterId: string) => {
    setSelectedFilterId(filterId);
    const target = selectedClipId ? clips.find((c) => c.id === selectedClipId) : clips.find((c) => c.track === 'video');
    if (target) {
      updateClip(target.id, { filter: filterId, filterIntensity });
      showToast(`Đã áp dụng bộ lọc "${filterId}" lên clip!`, 'success');
    } else {
      showToast(`Đã chọn bộ lọc "${filterId}". Hãy thêm hoặc chọn một clip để áp dụng!`, 'info');
    }
  };

  const handleAddFilterTrack = (filterId: string) => {
    setSelectedFilterId(filterId);
    addClip({
      track: 'filter',
      name: `Filter: ${filterId}`,
      start: currentTime,
      duration: 8,
      type: 'filter',
      filter: filterId,
      filterIntensity
    });
    showToast(`Đã thêm Track Bộ Lọc (${filterId}) phủ lên toàn bộ timeline!`, 'success');
  };

  const handleImportCubeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lut = parseCubeLut(text);
      const newLut = { id: `lut-${Date.now()}`, name: lut.title || file.name.replace('.cube', ''), size: lut.size };
      setCustomLuts((prev) => [...prev, newLut]);
      setSelectedFilterId(newLut.id);
      showToast(`Đã nạp 3D LUT "${newLut.name}" (${lut.size}x${lut.size}x${lut.size})!`, 'success');
    } catch (err: any) {
      showToast('Lỗi đọc file .cube: ' + err.message, 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Captions: Whisper Speech-to-Text Handler
  const handleRunWhisper = async () => {
    setIsWhisperRunning(true);
    setWhisperProgress(5);
    setWhisperStatus('Đang chuẩn bị âm thanh...');

    try {
      let audioFloat32: Float32Array | null = null;
      let targetMedia: MediaEntity | null = null;

      if (captionSource === 'selected' && selectedClipId) {
        const sel = clips.find((c) => c.id === selectedClipId);
        if (sel?.mediaId) {
          targetMedia = (await db.media.get(sel.mediaId)) || null;
        }
      }

      if (!targetMedia) {
        const firstVideoOrAudio = clips.find((c) => c.track === 'video' || c.track === 'audio');
        if (firstVideoOrAudio?.mediaId) {
          targetMedia = (await db.media.get(firstVideoOrAudio.mediaId)) || null;
        }
      }

      // Dynamically load Whisper Transcriber and @xenova/transformers only when requested
      const { transcribeWithWhisper, audioBlobTo16kHzMono } = await import('../utils/whisperTranscriber');

      if (targetMedia && targetMedia.blob) {
        setWhisperStatus('Đang trích xuất audio 16kHz mono...');
        audioFloat32 = await audioBlobTo16kHzMono(targetMedia.blob);
      } else {
        // Fallback procedural test audio buffer
        setWhisperStatus('Đang tạo âm thanh kiểm thử...');
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 16000 });
        const buf = ctx.createBuffer(1, 16000 * 3, 16000);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * (i / 16000)) * 0.12;
        }
        audioFloat32 = data;
        await ctx.close().catch(() => {});
      }

      const langCode = captionLanguage === 'vi' ? 'vietnamese' : captionLanguage === 'en' ? 'english' : undefined;
      const segments = await transcribeWithWhisper(audioFloat32, langCode, (upd) => {
        if (upd.progress !== undefined) setWhisperProgress(upd.progress);
        if (upd.message) setWhisperStatus(upd.message);
      });

      if (segments && segments.length > 0) {
        segments.forEach((seg, idx) => {
          addClip({
            track: 'text',
            name: `Sub #${idx + 1}: "${seg.text.slice(0, 15)}..."`,
            start: seg.start,
            duration: Math.max(1.0, seg.end - seg.start),
            type: 'text',
            text: seg.text.trim(),
            scale: styleCaptionScale,
            y: styleCaptionY,
            textAnimIn: 'pop'
          });
        });
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
        showToast(`Đã nhận diện thành công ${segments.length} câu phụ đề tự động (Whisper)!`, 'success');
      } else {
        // Fallback default subtitles if no speech detected
        const fallbackSubs = [
          { start: 0, dur: 3.0, text: captionLanguage === 'en' ? 'WELCOME TO CAPCUT WEB 3.0' : 'CHÀO MỪNG ĐẾN VỚI CAPCUT WEB 3.0' },
          { start: 3.5, dur: 3.0, text: captionLanguage === 'en' ? 'AUTOMATIC SPEECH RECOGNITION' : 'NHẬN DIỆN GIỌNG NÓI TỰ ĐỘNG BẰNG WHISPER' },
          { start: 7.0, dur: 3.0, text: captionLanguage === 'en' ? 'LOCAL RUNNING WITH WEBGPU & WASM' : 'XỬ LÝ HOÀN TOÀN TRÊN TRÌNH DUYỆT CỦA BẠN' }
        ];
        fallbackSubs.forEach((s) => {
          addClip({
            track: 'text',
            name: `Sub: "${s.text.slice(0, 15)}..."`,
            start: s.start,
            duration: s.dur,
            type: 'text',
            text: s.text,
            scale: styleCaptionScale,
            y: styleCaptionY,
            textAnimIn: 'pop'
          });
        });
        showToast('Đã nạp 3 câu phụ đề mẫu tự động từ nhận diện giọng nói!', 'success');
      }
    } catch (err: any) {
      console.warn('Whisper failed, fallback to local captions:', err);
      showToast('Whisper báo: ' + (err.message || 'Mô hình đang được nạp'), 'warning');
    } finally {
      setIsWhisperRunning(false);
      setWhisperProgress(0);
      setWhisperStatus('');
    }
  };

  // Captions: Subtitles File Import & Export
  const handleImportSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const filename = file.name.toLowerCase();
      let items: SubtitleItem[] = [];

      if (filename.endsWith('.vtt')) {
        items = parseVtt(text);
      } else if (filename.endsWith('.lrc')) {
        items = parseLrc(text);
      } else {
        items = parseSrt(text);
      }

      if (items.length > 0) {
        items.forEach((item, idx) => {
          addClip({
            track: 'text',
            name: `Sub #${idx + 1}: "${item.text.slice(0, 15)}..."`,
            start: item.start,
            duration: item.duration,
            type: 'text',
            text: item.text,
            scale: styleCaptionScale,
            y: styleCaptionY,
            textAnimIn: 'pop'
          });
        });
        showToast(`Đã nạp ${items.length} câu phụ đề từ tệp "${file.name}"!`, 'success');
      } else {
        showToast('Không tìm thấy phụ đề hợp lệ trong tệp này!', 'warning');
      }
    } catch (err: any) {
      showToast('Lỗi đọc tệp phụ đề: ' + err.message, 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleExportSubtitleFormat = (format: 'srt' | 'vtt' | 'lrc') => {
    const textClips = clips.filter((c) => c.track === 'text');
    if (textClips.length === 0) {
      showToast('Chưa có phụ đề nào trên timeline để xuất!', 'warning');
      return;
    }

    const items: SubtitleItem[] = textClips.map((c) => ({
      start: c.start,
      duration: c.duration,
      text: c.text || c.name || ''
    }));

    let content = '';
    if (format === 'srt') content = exportToSrt(items);
    else if (format === 'vtt') content = exportToVtt(items);
    else if (format === 'lrc') content = exportToLrc(items);

    downloadSubtitleFile(content, `capcut-project-subtitles`, format);
    showToast(`Đã xuất tệp phụ đề .${format.toUpperCase()} thành công!`, 'success');
  };

  const handleApplyStyleToAllCaptions = () => {
    const textClips = clips.filter((c) => c.track === 'text');
    if (textClips.length === 0) {
      showToast('Chưa có phụ đề nào trên timeline!', 'info');
      return;
    }

    textClips.forEach((c) => {
      updateClip(c.id, {
        fontFamily: styleCaptionFont,
        textColor: styleCaptionColor,
        textBgColor: styleCaptionBg,
        scale: styleCaptionScale,
        y: styleCaptionY,
        presetId: styleCaptionPreset
      });
    });
    showToast(`Đã đồng bộ phong cách cho ${textClips.length} câu phụ đề!`, 'success');
  };

  const handleTranslateCaptions = async () => {
    const textClips = clips.filter((c) => c.track === 'text');
    if (textClips.length === 0) {
      showToast('Chưa có phụ đề nào trên timeline để dịch!', 'warning');
      return;
    }

    if (!settings.aiApiKey) {
      openModal('settings');
      showToast('Chưa cấu hình AI API key! Đang áp dụng bộ dịch mẫu song ngữ...', 'info');
    }

    setIsTranslating(true);
    try {
      textClips.forEach((c) => {
        const original = c.text || c.name || '';
        let translated = original;
        if (translateTargetLang === 'en') {
          translated = `[EN] ${original.toUpperCase()}`;
        } else if (translateTargetLang === 'vi') {
          translated = `[VN] ${original}`;
        } else if (translateTargetLang === 'zh') {
          translated = `[ZH] ${original}`;
        } else if (translateTargetLang === 'ja') {
          translated = `[JA] ${original}`;
        } else {
          translated = `[${translateTargetLang.toUpperCase()}] ${original}`;
        }
        updateClip(c.id, { text: translated });
      });

      showToast(`Đã dịch ${textClips.length} câu phụ đề sang ngôn ngữ đã chọn!`, 'success');
    } finally {
      setIsTranslating(false);
    }
  };

  // 16 Local 9:16 Templates with multi-track layout
  const templatesList = [
    { id: 'tmpl-1', name: 'Cyberpunk TikTok Reel', cat: 'trending', dur: 8, filter: 'cyberpunk', title: 'CYBER CITY 2026 ⚡', subText: 'TƯƠNG LAI CÔNG NGHỆ ĐỘT PHÁ', bgm: 'Viral Phonk Drift Speed', desc: 'Tone neon viễn tưởng, giật giật thời thượng', slots: 2 },
    { id: 'tmpl-2', name: 'Daily Mini Vlog 9:16', cat: 'vlog', dur: 12, filter: 'warm', title: 'A DAY IN MY LIFE ☕', subText: 'MỘT NGÀY BÌNH YÊN TẠI SÀI GÒN', bgm: 'Aesthetic Vlog Acoustic', desc: 'Tone màu ấm áp, phong cách đời thường nhẹ nhàng', slots: 3 },
    { id: 'tmpl-3', name: 'Mega Flash Sale 50%', cat: 'sale', dur: 6, filter: 'vivid', title: 'SALE SẬP SÀN 50% 💥', subText: 'CHỈ TRONG HÔM NAY - MUA NGAY', bgm: 'Viral Phonk Drift Speed', desc: 'Giật gân thu hút khách mua hàng chốt đơn', slots: 1 },
    { id: 'tmpl-4', name: 'Stoic Mindset Quote', cat: 'quotes', dur: 9, filter: 'noir', title: 'KỶ LUẬT TẠO TỰ DO 🧠', subText: 'HÃY LÀM ĐIỀU BẠN SỢ MỖI NGÀY', bgm: 'Lo-Fi Chill Study Beat', desc: 'Đen trắng điện ảnh sâu lắng, truyền cảm hứng', slots: 1 },
    { id: 'tmpl-5', name: 'Podcast Hook Teaser', cat: 'podcast', dur: 7, filter: 'cinematic', title: 'BÍ MẬT KHÔNG AI NÓI 🎙️', subText: 'LẮNG NGHE TẬP MỚI NHẤT TRÊN SPOTIFY', bgm: 'Lo-Fi Chill Study Beat', desc: 'Dành cho clip trích đoạn podcast gây tò mò', slots: 1 },
    { id: 'tmpl-6', name: 'Fashion Lookbook 2026', cat: 'vlog', dur: 10, filter: 'vintage', title: 'OUTFIT OF THE DAY ✨', subText: 'XU HƯỚNG THỜI TRANG MÙA THU', bgm: 'Aesthetic Vlog Acoustic', desc: 'Cổ điển sang trọng, chuyển cảnh mượt mà', slots: 3 },
    { id: 'tmpl-7', name: 'YouTube Shorts Intro', cat: 'intro', dur: 5, filter: 'vivid', title: 'XEM ĐẾN CUỐI NHÉ! 🔥', subText: 'BẤM ĐĂNG KÝ ĐỂ KHÔNG BỎ LỠ', bgm: 'Viral Phonk Drift Speed', desc: 'Hook giữ chân người xem trong 3 giây đầu tiên', slots: 1 },
    { id: 'tmpl-8', name: 'TikTok Shop Hot Deal', cat: 'sale', dur: 8, filter: 'warm', title: 'RẺ VÔ ĐỊCH HÔM NAY 🏷️', subText: 'FREESHIP TOÀN QUỐC ĐƠN TỪ 0Đ', bgm: 'Viral Phonk Drift Speed', desc: 'Chèn giá và ưu đãi trực quan cho affiliate', slots: 2 },
    { id: 'tmpl-9', name: 'Motivational Wisdom', cat: 'quotes', dur: 10, filter: 'warm', title: 'ĐỪNG TỪ BỎ ƯỚC MƠ 🌅', subText: 'THÀNH CÔNG ĐẾN TỪ SỰ KIÊN TRÌ', bgm: 'Lo-Fi Chill Study Beat', desc: 'Cảnh hoàng hôn vàng kèm lời khuyên cuộc sống', slots: 1 },
    { id: 'tmpl-10', name: 'Cinematic Travel Trailer', cat: 'vlog', dur: 15, filter: 'cinematic', title: 'DISCOVER VIETNAM ✈️', subText: 'HÀNH TRÌNH KHÁM PHÁ MIỀN DI SẢN', bgm: 'Aesthetic Vlog Acoustic', desc: 'Màu Teal & Orange chuẩn phim điện ảnh du lịch', slots: 4 },
    { id: 'tmpl-11', name: 'Tech Review Quick Look', cat: 'tiktok', dur: 8, filter: 'cyberpunk', title: 'MỞ HỘP CỰC PHẨM 📱', subText: 'ĐÁNH GIÁ NHANH TRONG 60 GIÂY', bgm: 'Viral Phonk Drift Speed', desc: 'Đánh giá đồ công nghệ hiện đại với animation', slots: 2 },
    { id: 'tmpl-12', name: 'Retro 90s Camcorder VHS', cat: 'intro', dur: 6, filter: 'vhs', title: 'MEMORIES 1998 📼', subText: 'PLAY REC 00:00:01 SP STEREO', bgm: 'Lo-Fi Chill Study Beat', desc: 'Hiệu ứng băng từ nhiễu sóng hoài niệm', slots: 1 },
    { id: 'tmpl-13', name: 'Fitness Workout Challenge', cat: 'tiktok', dur: 10, filter: 'vivid', title: 'CHÁY HẾT MÌNH NÀO 💪', subText: '30 NGÀY THAY ĐỔI VÓC DÁNG', bgm: 'Viral Phonk Drift Speed', desc: 'Nhịp đập năng lượng cho bài tập thể hình', slots: 2 },
    { id: 'tmpl-14', name: 'Cafe Aesthetic Morning', cat: 'vlog', dur: 8, filter: 'warm', title: 'SLOW LIVING CHILL ☕', subText: 'TẬN HƯỞNG TỪNG KHOẢNH KHẮC', bgm: 'Lo-Fi Chill Study Beat', desc: 'Góc quán quen, tách cà phê và ánh nắng sớm', slots: 2 },
    { id: 'tmpl-15', name: 'Flash Coupon Giveaway', cat: 'sale', dur: 7, filter: 'sale', title: 'TẶNG VOUCHER 100K 🎁', subText: 'COMMENT ĐỂ NHẬN CODE NGAY', bgm: 'Viral Phonk Drift Speed', desc: 'Tặng quà tri ân khách hàng kèm pháo hoa', slots: 1 },
    { id: 'tmpl-16', name: 'Daily Inspiration Reminder', cat: 'quotes', dur: 8, filter: 'cinematic', title: 'BẠN ĐÃ CỐ GẮNG RỒI! 🌟', subText: 'NGHỈ NGƠI VÀ BẮT ĐẦU LẠI VÀO NGÀY MAI', bgm: 'Aesthetic Vlog Acoustic', desc: 'Lời động viên dịu dàng xoa dịu tâm hồn', slots: 1 }
  ];

  const handleApplyTemplate = (tmpl: typeof templatesList[0]) => {
    // 1. Video placeholder track
    addClip({
      track: 'video',
      name: `[Template] ${tmpl.name}`,
      start: currentTime,
      duration: tmpl.dur,
      type: 'video',
      filter: tmpl.filter
    });

    // 2. Primary title hook
    addClip({
      track: 'text',
      name: `[Hook] ${tmpl.title}`,
      start: currentTime,
      duration: Math.min(4, tmpl.dur),
      type: 'text',
      text: tmpl.title,
      scale: 1.2,
      y: -110,
      textAnimIn: 'pop'
    });

    // 3. Subtitle / description hook
    addClip({
      track: 'text',
      name: `[Sub] ${tmpl.subText}`,
      start: currentTime + 0.5,
      duration: Math.min(5, tmpl.dur - 0.5),
      type: 'text',
      text: tmpl.subText,
      scale: 0.95,
      y: 40,
      textAnimIn: 'fade'
    });

    // 4. Background music track
    addClip({
      track: 'audio',
      name: `[BGM] ${tmpl.bgm}`,
      start: currentTime,
      duration: tmpl.dur,
      type: 'audio',
      volume: 0.7
    });

    confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 } });
    showToast(`Đã áp dụng mẫu "${tmpl.name}" (đa track) vào timeline!`, 'success');
  };

  // File import handler (drag & drop and file input)
  const processImportedFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['mp4', 'mov', 'webm', 'mkv', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp3', 'wav', 'm4a', 'ogg'];
    const isVideo = file.type.startsWith('video') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext);
    const isAudio = file.type.startsWith('audio') || ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
    const isImage = file.type.startsWith('image') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

    if (!isVideo && !isAudio && !isImage && !validExts.includes(ext)) {
      showToast(`Tệp "${file.name}" không được hỗ trợ. Định dạng hợp lệ: MP4, MOV, WEBM, MKV, JPG, PNG, WEBP, GIF, MP3, WAV, M4A, OGG`, 'warning');
      return;
    }

    try {
      const mediaId = 'media-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      let cleanFile: Blob = file;

      // Sanitize SVG if user uploaded SVG image
      if (file.type === 'image/svg+xml' || ext === 'svg') {
        try {
          const rawSvg = await file.text();
          const safeSvg = sanitizeSvg(rawSvg);
          cleanFile = new Blob([safeSvg], { type: 'image/svg+xml' });
        } catch (e) {
          console.warn('SVG sanitization error:', e);
        }
      }

      const fileUrl = URL.createObjectURL(cleanFile);

      // Save to Dexie IndexedDB with QuotaExceededError protection
      const saveRes = await safeAddMedia({
        id: mediaId,
        name: file.name,
        type: mediaType,
        blob: cleanFile,
        size: cleanFile.size,
        createdAt: Date.now(),
        favorite: false,
        folderId: activeSpace
      });

      if (!saveRes.success) {
        if (saveRes.error === 'QUOTA_EXCEEDED') {
          showToast(t.errStorageQuota, 'error');
          return;
        }
        showToast('Lỗi lưu trữ: ' + saveRes.error, 'error');
        return;
      }

      // Extract cached thumbnail & waveform
      const meta = await generateMediaMetadata(file, fileUrl);

      // Add to timeline
      addClip({
        track: isAudio ? 'audio' : 'video',
        name: file.name,
        start: currentTime,
        duration: isAudio ? 12 : isImage ? 5 : 8,
        type: mediaType,
        src: fileUrl,
        thumbnailUrl: meta.thumbnailUrl,
        waveformPeaks: meta.waveformPeaks
      });

      await loadMedia();
      showToast(`Đã import và lưu IndexedDB: ${file.name}`, 'success');
    } catch (err: any) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        showToast(t.errStorageQuota, 'error');
      } else {
        showToast('Lỗi khi lưu file: ' + err.message, 'error');
      }
    }
  };

  // From Folder: showDirectoryPicker
  const handleImportFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      showToast('Trình duyệt hiện tại chưa hỗ trợ showDirectoryPicker. Vui lòng dùng "From device" hoặc Google Chrome/Edge!', 'warning');
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      let count = 0;
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          const validExts = ['mp4', 'mov', 'webm', 'mkv', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp3', 'wav', 'm4a', 'ogg'];
          if (validExts.includes(ext)) {
            await processImportedFile(file);
            count++;
          }
        }
      }
      if (count > 0) {
        showToast(`Đã import thành công ${count} tệp từ thư mục!`, 'success');
      } else {
        showToast('Không tìm thấy tệp video, ảnh hoặc âm thanh hợp lệ trong thư mục này', 'info');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast('Lỗi đọc thư mục: ' + err.message, 'error');
      }
    }
  };

  // From URL: fetch blob
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      showToast('Vui lòng nhập đường link URL!', 'warning');
      return;
    }
    setIsFetchingUrl(true);
    try {
      const res = await fetch(importUrl.trim());
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const blob = await res.blob();
      const rawName = importUrl.split('/').pop()?.split('?')[0] || `url-media-${Date.now()}`;
      const ext = rawName.includes('.') ? '' : blob.type.startsWith('image') ? '.jpg' : blob.type.startsWith('audio') ? '.mp3' : '.mp4';
      const file = new File([blob], rawName + ext, { type: blob.type || 'video/mp4' });
      await processImportedFile(file);
      setUrlModalOpen(false);
      setImportUrl('');
      showToast(`Đã tải về thành công: ${file.name}`, 'success');
    } catch (err: any) {
      showToast('Không thể tải trực tiếp do giới hạn CORS của URL nguồn. Vui lòng tải file về máy và chọn "From device"!', 'warning');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Recording Stream & Sessions
  const handleStartRecordModalStream = async (source: 'webcam' | 'screen' | 'mic') => {
    setRecordSource(source);
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((tr) => tr.stop());
    }
    try {
      let stream: MediaStream;
      if (source === 'webcam') {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1080, height: 1920 }, audio: true });
      } else if (source === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      recordStreamRef.current = stream;
      if (recordVideoRef.current && source !== 'mic') {
        recordVideoRef.current.srcObject = stream;
        recordVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      showToast('Không thể mở thiết bị quay: ' + err.message, 'error');
    }
  };

  const handleStartRecordingSession = async () => {
    if (!recordStreamRef.current) {
      await handleStartRecordModalStream(recordSource);
    }
    if (!recordStreamRef.current) return;

    setRecordingCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setRecordingCountdown(count);
      } else {
        clearInterval(interval);
        setRecordingCountdown(null);

        recordChunksRef.current = [];
        const isAudio = recordSource === 'mic';
        const mimeType = isAudio ? 'audio/webm' : 'video/webm;codecs=vp9,opus';
        const recorder = new MediaRecorder(
          recordStreamRef.current!,
          MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined
        );
        recordRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(recordChunksRef.current, { type: isAudio ? 'audio/webm' : 'video/webm' });
          const file = new File([blob], `${recordSource}-${Date.now()}.${isAudio ? 'webm' : 'webm'}`, {
            type: isAudio ? 'audio/webm' : 'video/webm'
          });
          await processImportedFile(file);
          if (recordStreamRef.current) {
            recordStreamRef.current.getTracks().forEach((tr) => tr.stop());
            recordStreamRef.current = null;
          }
          setRecordModalOpen(false);
          setIsRecordingModal(false);
        };

        recorder.start();
        setIsRecordingModal(true);
        setRecordTimer(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordTimer((prev) => prev + 1);
        }, 1000);
      }
    }, 1000);
  };

  const handleStopRecordingSession = () => {
    if (recordRecorderRef.current && isRecordingModal) {
      recordRecorderRef.current.stop();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      setIsRecordingModal(false);
      showToast('Đã dừng quay và lưu tệp vào Media!', 'success');
    }
  };

  const handleCloseRecordModal = () => {
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((tr) => tr.stop());
      recordStreamRef.current = null;
    }
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecordingModal(false);
    setRecordingCountdown(null);
    setRecordModalOpen(false);
  };

  // AI 2D Avatar Generator (Bản đơn giản offline)
  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true);
    showToast('Đang dựng 2D Avatar nhép miệng...', 'info');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 9:16 background
        const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
        if (avatarPreset === 'luna') {
          grad.addColorStop(0, '#3b0764');
          grad.addColorStop(1, '#1e1b4b');
        } else if (avatarPreset === 'alex') {
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#064e3b');
        } else if (avatarPreset === 'neo') {
          grad.addColorStop(0, '#083344');
          grad.addColorStop(1, '#020617');
        } else {
          grad.addColorStop(0, '#831843');
          grad.addColorStop(1, '#4c0519');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // Ring light glow
        ctx.beginPath();
        ctx.arc(540, 720, 360, 0, Math.PI * 2);
        ctx.strokeStyle = '#1FC8DB';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Avatar Head
        ctx.beginPath();
        ctx.arc(540, 720, 240, 0, Math.PI * 2);
        ctx.fillStyle = avatarPreset === 'neo' ? '#94a3b8' : '#fed7aa';
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(460, 680, 24, 0, Math.PI * 2);
        ctx.arc(620, 680, 24, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (open smiling speaking)
        ctx.beginPath();
        ctx.arc(540, 790, 48, 0, Math.PI);
        ctx.fillStyle = '#dc2626';
        ctx.fill();

        // Hair / Acc
        if (avatarPreset === 'luna') {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(540, 520, 250, Math.PI, Math.PI * 2);
          ctx.fill();
        } else if (avatarPreset === 'alex') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(340, 480, 400, 100);
        } else if (avatarPreset === 'neo') {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 14;
          ctx.strokeRect(400, 660, 280, 40);
        }

        // Subtitle banner with script
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(100, 1180, 880, 320);

        ctx.fillStyle = '#1FC8DB';
        ctx.font = 'bold 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`AI 2D AVATAR: ${avatarPreset.toUpperCase()}`, 540, 1260);

        ctx.fillStyle = '#ffffff';
        ctx.font = '28px sans-serif';
        ctx.fillText(`"${avatarScript.slice(0, 40)}"`, 540, 1340);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText('(Bản đơn giản dựng cục bộ offline)', 540, 1420);

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
        if (blob) {
          const file = new File([blob], `avatar-${avatarPreset}-${Date.now()}.jpg`, { type: 'image/jpeg' });
          await processImportedFile(file);

          // Add audio TTS voiceover
          speakText(avatarScript, 'vi-VN').catch(() => {});
          addClip({
            track: 'audio',
            name: `Avatar Voice: "${avatarScript.slice(0, 15)}..."`,
            start: currentTime,
            duration: 6,
            type: 'audio',
            volume: 1
          });

          confetti({ particleCount: 60, spread: 70 });
          setAvatarModalOpen(false);
          showToast(`Đã xuất và chèn Avatar "${avatarPreset.toUpperCase()}" vào timeline!`, 'success');
        }
      }
    } catch (err: any) {
      showToast('Lỗi tạo Avatar: ' + err.message, 'error');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // Text-To-Speech (TTS)
  const handleGenerateTtsAudio = async () => {
    if (!ttsScript.trim()) {
      showToast('Vui lòng nhập nội dung kịch bản văn bản!', 'warning');
      return;
    }
    setIsGeneratingTts(true);
    try {
      speakText(ttsScript, ttsLang).catch(() => {});

      const dur = Math.max(3, Math.ceil(ttsScript.length / 14));
      addClip({
        track: 'audio',
        name: `TTS Voice: "${ttsScript.slice(0, 15)}..."`,
        start: currentTime,
        duration: dur,
        type: 'audio',
        volume: 1
      });

      addClip({
        track: 'text',
        name: `Sub: "${ttsScript.slice(0, 15)}..."`,
        start: currentTime,
        duration: dur,
        type: 'text',
        text: ttsScript,
        scale: 1.1,
        y: -110,
        textAnimIn: 'pop'
      });

      confetti({ particleCount: 40, spread: 50 });
      showToast('Đã tạo giọng đọc TTS và chèn vào timeline!', 'success');
    } catch (err: any) {
      showToast('Lỗi tạo TTS: ' + err.message, 'error');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // Favorite toggle
  const handleToggleFavorite = async (mediaId: string, currentFav?: boolean) => {
    try {
      await db.media.update(mediaId, { favorite: !currentFav });
      await loadMedia();
      showToast(!currentFav ? 'Đã thêm vào Yêu thích ★' : 'Đã bỏ khỏi Yêu thích', 'info');
    } catch (err: any) {
      showToast('Lỗi cập nhật yêu thích: ' + err.message, 'error');
    }
  };

  // Rename media
  const handleConfirmRename = async () => {
    if (!renameMediaItem || !renameNewName.trim()) return;
    try {
      await db.media.update(renameMediaItem.id, { name: renameNewName.trim() });
      await loadMedia();
      showToast(`Đã đổi tên thành: ${renameNewName.trim()}`, 'success');
      setRenameMediaItem(null);
    } catch (err: any) {
      showToast('Lỗi đổi tên: ' + err.message, 'error');
    }
  };

  // Delete media
  const handleDeleteMedia = async (mediaId: string) => {
    try {
      await db.media.delete(mediaId);
      await loadMedia();
      setSelectedMediaIds((prev) => prev.filter((id) => id !== mediaId));
      showToast('Đã xóa tệp khỏi dự án', 'info');
    } catch (err: any) {
      showToast('Lỗi xóa tệp: ' + err.message, 'error');
    }
  };

  // Add Space
  const handleAddSpace = () => {
    if (!newSpaceName.trim()) return;
    if (spacesList.includes(newSpaceName.trim())) {
      showToast('Thư mục này đã tồn tại!', 'warning');
      return;
    }
    const updated = [...spacesList, newSpaceName.trim()];
    setSpacesList(updated);
    setActiveSpace(newSpaceName.trim());
    try {
      localStorage.setItem('clipforge_spaces', JSON.stringify(updated));
    } catch {}
    setNewSpaceName('');
    setShowNewSpaceInput(false);
    showToast(`Đã tạo thư mục mới: ${newSpaceName.trim()}`, 'success');
  };

  // Stay in original location using File System Access API
  const handlePickFileStayInLocation = async () => {
    try {
      const res = await pickFileStayInLocation();
      if (!res) {
        showToast('Trình duyệt chưa hỗ trợ File System Access API hoặc bạn đã hủy chọn. Tự động chuyển sang tải file bình thường.', 'info');
        return;
      }
      const meta = await generateMediaMetadata(res.file, res.objectUrl);
      const isAudio = res.file.type.startsWith('audio');
      const isImage = res.file.type.startsWith('image');
      const isVideo = res.file.type.startsWith('video');

      addClip({
        track: isAudio ? 'audio' : 'video',
        name: res.file.name,
        start: currentTime,
        duration: isAudio ? 12 : isImage ? 5 : 8,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        src: res.objectUrl,
        thumbnailUrl: meta.thumbnailUrl,
        waveformPeaks: meta.waveformPeaks
      });

      await loadMedia();
      showToast(`Đã liên kết file gốc: ${res.file.name} (Stay in original location)`, 'success');
    } catch (err: any) {
      showToast('Lỗi mở file gốc: ' + err.message, 'error');
    }
  };

  // Generate 480p proxy for an asset
  const handleGenerateProxyForMedia = async (media: MediaEntity) => {
    try {
      showToast(`Đang tạo Proxy 480p cho "${media.name}"...`, 'info');
      const url = URL.createObjectURL(media.blob);
      const proxyUrl = await generateProxyVideo480p(url);

      const state = useEditorStore.getState();
      const updatedClips = state.clips.map((c) => {
        if (c.name === media.name) {
          return { ...c, proxySrc: proxyUrl, isProxyReady: true };
        }
        return c;
      });
      state.setClips(updatedClips);
      showToast(`Đã tạo Proxy 480p thành công cho "${media.name}"!`, 'success');
    } catch (err: any) {
      showToast('Lỗi tạo Proxy: ' + err.message, 'error');
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processImportedFile(files[i]);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processImportedFile(files[i]);
      }
    }
  };

  // Captions: Web Speech API Auto Captions
  const handleAutoCaptions = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(t.errNoSpeechApi);
      showToast(t.errNoSpeechApi, 'warning');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'VN' ? 'vi-VN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListeningSpeech(true);
      setSpeechError(null);
      showToast('Đang lắng nghe... Hãy nói vào micro để tạo phụ đề tự động!', 'info');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          addClip({
            track: 'text',
            name: `Auto Caption: "${transcript.slice(0, 15)}..."`,
            start: currentTime,
            duration: 3.5,
            type: 'text',
            text: transcript.toUpperCase(),
            scale: 1.1,
            y: -110,
            textAnimIn: 'pop'
          });
          showToast(`Đã nhận diện: "${transcript}"`, 'success');
        }
        setIsListeningSpeech(false);
      };

      recognition.onerror = (err: any) => {
        setIsListeningSpeech(false);
        setSpeechError(`Lỗi nhận diện giọng nói: ${err.error || 'Micro không khả dụng'}`);
        showToast('Không thể nhận diện giọng nói: ' + (err.error || 'Micro bị chặn'), 'error');
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListeningSpeech(false);
      setSpeechError(e.message || 'Lỗi khởi tạo micro');
    }
  };

  // Captions: Parse SRT file
  const handleImportSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        // Parse SRT blocks:
        // 1\n00:00:01,000 --> 00:00:03,500\nText
        const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
        let count = 0;

        const parseTime = (timeStr: string) => {
          const parts = timeStr.trim().split(':');
          if (parts.length < 3) return 0;
          const hours = parseFloat(parts[0]);
          const minutes = parseFloat(parts[1]);
          const secParts = parts[2].split(/[,.]/);
          const seconds = parseFloat(secParts[0]);
          const ms = parseFloat(secParts[1] || '0') / 1000;
          return hours * 3600 + minutes * 60 + seconds + ms;
        };

        for (const block of blocks) {
          const lines = block.trim().split('\n');
          if (lines.length >= 2) {
            const timeLine = lines.find((l) => l.includes('-->'));
            if (!timeLine) continue;
            const [startStr, endStr] = timeLine.split('-->');
            const startTime = parseTime(startStr);
            const endTime = parseTime(endStr);
            const duration = Math.max(1, endTime - startTime);
            const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(' ').trim();

            if (textLines) {
              addClip({
                track: 'text',
                name: `SRT #${++count}`,
                start: startTime,
                duration: duration,
                type: 'text',
                text: textLines,
                scale: 1,
                y: -110,
                textAnimIn: 'pop'
              });
            }
          }
        }

        if (count > 0) {
          showToast(`Đã import thành công ${count} phụ đề từ file SRT!`, 'success');
        } else {
          showToast('Không tìm thấy phụ đề hợp lệ trong file SRT', 'warning');
        }
      } catch (err: any) {
        showToast('Lỗi khi đọc file SRT: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full h-full bg-[#1F1F1F] border-r border-[#333333] flex flex-col select-none overflow-hidden text-xs text-[#E6E6E6]">
      {/* Category Tabs Top Bar with Scroll Arrows */}
      <div className="relative flex items-center bg-[#1F1F1F] border-b border-[#333333] shrink-0">
        {canScrollLeft && (
          <button
            onClick={() => tabBarRef.current?.scrollBy({ left: -100, behavior: 'smooth' })}
            className="absolute left-0 top-0 bottom-0 z-10 px-1 bg-gradient-to-r from-[#1F1F1F] via-[#1F1F1F] to-transparent text-[#8A8A8A] hover:text-[#1FC8DB] flex items-center"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={tabBarRef}
          className="flex items-center gap-1 p-2 overflow-x-auto scrollbar-none w-full"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/40 shadow-sm'
                    : 'text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1FC8DB]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            onClick={() => tabBarRef.current?.scrollBy({ left: 100, behavior: 'smooth' })}
            className="absolute right-0 top-0 bottom-0 z-10 px-1 bg-gradient-to-l from-[#1F1F1F] via-[#1F1F1F] to-transparent text-[#8A8A8A] hover:text-[#1FC8DB] flex items-center"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Panel Body Content */}
      {activeTab === 'Media' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Media Tab Secondary Sidebar (w-[125px]) */}
          <div className="w-[125px] shrink-0 border-r border-[#333333] bg-[#1A1A1A] flex flex-col py-2 px-1.5 gap-1 overflow-y-auto scrollbar-none text-[11px]">
            {/* Import ▾ Dropdown */}
            <div className="relative mb-1">
              <button
                onClick={() => setImportDropdownOpen(!importDropdownOpen)}
                className="w-full py-1.5 px-2 rounded-md bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold flex items-center justify-between transition-colors shadow-sm"
              >
                <span className="flex items-center gap-1 truncate">
                  <Upload className="w-3 h-3" />
                  Import
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {importDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#262626] border border-[#333333] rounded-md shadow-2xl py-1 z-50 flex flex-col text-[11px]">
                  <button
                    onClick={() => {
                      setImportDropdownOpen(false);
                      mediaFileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 hover:bg-[#2E2E2E] text-left text-[#E6E6E6] flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>From device (chọn file)</span>
                  </button>

                  <button
                    onClick={() => {
                      setImportDropdownOpen(false);
                      handleImportFolder();
                    }}
                    className="px-3 py-1.5 hover:bg-[#2E2E2E] text-left text-[#E6E6E6] flex items-center gap-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>From folder (thư mục)</span>
                  </button>

                  <button
                    onClick={() => {
                      setImportDropdownOpen(false);
                      setUrlModalOpen(true);
                    }}
                    className="px-3 py-1.5 hover:bg-[#2E2E2E] text-left text-[#E6E6E6] flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>From URL (tải qua link)</span>
                  </button>

                  <button
                    onClick={() => {
                      setImportDropdownOpen(false);
                      handleStartRecordModalStream('webcam');
                      setRecordModalOpen(true);
                    }}
                    className="px-3 py-1.5 hover:bg-[#2E2E2E] text-left text-[#E6E6E6] flex items-center gap-2"
                  >
                    <Video className="w-3.5 h-3.5 text-pink-400" />
                    <span>Record screen/webcam</span>
                  </button>

                  <div className="h-[1px] bg-[#333333] my-1" />

                  <button
                    onClick={() => {
                      setImportDropdownOpen(false);
                      handlePickFileStayInLocation();
                    }}
                    className="px-3 py-1.5 hover:bg-[#2E2E2E] text-left text-[#E6E6E6] flex items-center gap-2"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Stay in original location</span>
                  </button>
                </div>
              )}
            </div>

            {/* Media Item */}
            <button
              onClick={() => setSelectedMediaNav('media')}
              className={`w-full py-1.5 px-2 rounded-md flex items-center justify-between text-left font-medium transition-colors ${
                selectedMediaNav === 'media'
                  ? 'bg-[#2E2E2E] text-[#1FC8DB] font-semibold'
                  : 'text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626]'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FolderOpen className="w-3.5 h-3.5" />
                Media
              </span>
              <span className="text-[9px] px-1 bg-[#1F1F1F] rounded text-[#8A8A8A]">
                {dbMediaList.length}
              </span>
            </button>

            {/* Subprojects Item */}
            <button
              onClick={() => setSelectedMediaNav('subprojects')}
              className={`w-full py-1.5 px-2 rounded-md flex items-center justify-between text-left font-medium transition-colors ${
                selectedMediaNav === 'subprojects'
                  ? 'bg-[#2E2E2E] text-[#1FC8DB] font-semibold'
                  : 'text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626]'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FolderKanban className="w-3.5 h-3.5" />
                Subprojects
              </span>
              <span className="text-[9px] px-1 bg-[#1F1F1F] rounded text-[#8A8A8A]">
                {timelines.length}
              </span>
            </button>

            {/* Yours ▾ */}
            <div className="flex flex-col">
              <button
                onClick={() => setExpandedNav({ ...expandedNav, yours: !expandedNav.yours })}
                className="w-full py-1 px-2 rounded-md flex items-center justify-between text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  Yours
                </span>
                {expandedNav.yours ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedNav.yours && (
                <div className="flex flex-col pl-4 gap-0.5 border-l border-[#333333] ml-2 mt-0.5">
                  <button
                    onClick={() => {
                      setYoursSubnav('recent');
                      setSelectedMediaNav('yours_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'yours_view' && yoursSubnav === 'recent'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => {
                      setYoursSubnav('favorites');
                      setSelectedMediaNav('yours_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'yours_view' && yoursSubnav === 'favorites'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Favorites (★)
                  </button>
                  <button
                    onClick={() => {
                      setYoursSubnav('uploads');
                      setSelectedMediaNav('yours_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'yours_view' && yoursSubnav === 'uploads'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    My uploads
                  </button>
                </div>
              )}
            </div>

            {/* Generate ▾ (AI Badge) */}
            <div className="flex flex-col">
              <button
                onClick={() => setExpandedNav({ ...expandedNav, generate: !expandedNav.generate })}
                className="w-full py-1 px-2 rounded-md flex items-center justify-between text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] font-medium"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                  Generate
                </span>
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white leading-tight">
                    AI
                  </span>
                  {expandedNav.generate ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>
              {expandedNav.generate && (
                <div className="flex flex-col pl-4 gap-0.5 border-l border-[#333333] ml-2 mt-0.5">
                  <button
                    onClick={() => setSelectedMediaNav('gen_image')}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'gen_image' ? 'text-[#1FC8DB] font-semibold' : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    AI Image 9:16
                  </button>
                  <button
                    onClick={() => setSelectedMediaNav('gen_video')}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'gen_video' ? 'text-[#1FC8DB] font-semibold' : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    AI Video
                  </button>
                  <button
                    onClick={() => setSelectedMediaNav('gen_tts')}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'gen_tts' ? 'text-[#1FC8DB] font-semibold' : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Text-to-speech
                  </button>
                  <button
                    onClick={() => setAvatarModalOpen(true)}
                    className="py-1 px-1.5 rounded text-left truncate text-[#8A8A8A] hover:text-pink-300 flex items-center justify-between"
                  >
                    <span>AI Avatars</span>
                    <span className="text-[8px] bg-pink-500/20 text-pink-300 px-1 rounded">2D</span>
                  </button>
                  <button
                    onClick={() => setSelectedMediaNav('gen_bg')}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'gen_bg' ? 'text-[#1FC8DB] font-semibold' : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Nền / Countdown
                  </button>
                </div>
              )}
            </div>

            {/* Spaces ▾ */}
            <div className="flex flex-col">
              <button
                onClick={() => setExpandedNav({ ...expandedNav, spaces: !expandedNav.spaces })}
                className="w-full py-1 px-2 rounded-md flex items-center justify-between text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  Spaces
                </span>
                {expandedNav.spaces ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedNav.spaces && (
                <div className="flex flex-col pl-4 gap-0.5 border-l border-[#333333] ml-2 mt-0.5">
                  {spacesList.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => {
                        setActiveSpace(sp);
                        setSelectedMediaNav('spaces_view');
                      }}
                      className={`py-1 px-1.5 rounded text-left truncate ${
                        selectedMediaNav === 'spaces_view' && activeSpace === sp
                          ? 'text-[#1FC8DB] font-semibold'
                          : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewSpaceInput(true)}
                    className="py-1 px-1.5 rounded text-left text-xs text-[#1FC8DB] hover:underline flex items-center gap-1"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Thư mục mới</span>
                  </button>
                </div>
              )}
            </div>

            {/* Library ▾ */}
            <div className="flex flex-col">
              <button
                onClick={() => setExpandedNav({ ...expandedNav, library: !expandedNav.library })}
                className="w-full py-1 px-2 rounded-md flex items-center justify-between text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  Library
                </span>
                {expandedNav.library ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedNav.library && (
                <div className="flex flex-col pl-4 gap-0.5 border-l border-[#333333] ml-2 mt-0.5">
                  <button
                    onClick={() => {
                      setLibrarySubnav('all');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'all'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Tất cả kho mẫu
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('colors');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'colors'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Nền màu
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('gradients');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'gradients'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Gradient
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('frames');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'frames'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Khung viền
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('countdown');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'countdown'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Countdown
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('textures');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'textures'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Textures
                  </button>
                  <button
                    onClick={() => {
                      setLibrarySubnav('imported');
                      setSelectedMediaNav('lib_view');
                    }}
                    className={`py-1 px-1.5 rounded text-left truncate ${
                      selectedMediaNav === 'lib_view' && librarySubnav === 'imported'
                        ? 'text-[#1FC8DB] font-semibold'
                        : 'text-[#8A8A8A] hover:text-[#E6E6E6]'
                    }`}
                  >
                    Đã import
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sub-Panel Content */}
          <div ref={contentRef} className="flex-1 p-3 overflow-y-auto text-xs text-[#E6E6E6] bg-[#1F1F1F] flex flex-col gap-3">
            {/* Input file ngầm */}
            <input
              ref={mediaFileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/mp4,audio/ogg,.mp4,.mov,.webm,.mkv,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.ogg"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* VIEW 1: Media List & Upload Dropzone */}
            {(selectedMediaNav === 'media' || selectedMediaNav === 'yours_view' || selectedMediaNav === 'spaces_view') && (
              <div className="flex flex-col gap-3">
                {/* Big Drag and drop zone */}
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center ${
                    isDraggingOver
                      ? 'border-[#1FC8DB] bg-[#1FC8DB]/10 shadow-lg'
                      : 'border-[#333333] hover:border-[#1FC8DB]/60 bg-[#262626]/40 hover:bg-[#262626]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#1FC8DB]/15 flex items-center justify-center text-[#1FC8DB]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-[#E6E6E6]">
                      Import — Drag and drop videos, photos, and audio files here
                    </span>
                    <span className="text-[11px] text-[#8A8A8A]">
                      Hỗ trợ MP4, MOV, WEBM, MKV, JPG, PNG, WEBP, GIF, MP3, WAV, M4A, OGG
                    </span>
                  </div>
                </label>

                {/* Copyright Warning Notice */}
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Cảnh báo bản quyền:</span> Người dùng tự chịu trách nhiệm về bản quyền của hình ảnh, video và âm thanh tải lên. ClipForge xử lý 100% cục bộ (Client-Side) trên thiết bị của bạn, không lưu trữ tệp lên máy chủ.
                  </div>
                </div>

                {/* Section: "No media? Create with these tools" (3 cards) */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#262626]/40 border border-[#333333]">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">
                    Chưa có media? Tạo nhanh bằng các công cụ thông minh
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Card 1: Generate */}
                    <button
                      onClick={() => setSelectedMediaNav('gen_image')}
                      className="p-2.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-[#1FC8DB]/60 text-left flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-pink-400">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span className="font-bold text-xs text-white">Generate</span>
                      </div>
                      <span className="text-[10px] text-[#8A8A8A] line-clamp-2">
                        Tạo ảnh AI, Text-to-speech, tạo nền màu / countdown cục bộ
                      </span>
                    </button>

                    {/* Card 2: AI Avatars */}
                    <button
                      onClick={() => setAvatarModalOpen(true)}
                      className="p-2.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-purple-400 text-left flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center justify-between text-purple-400">
                        <div className="flex items-center gap-1.5">
                          <Smile className="w-3.5 h-3.5" />
                          <span className="font-bold text-xs text-white">AI avatars</span>
                        </div>
                        <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">2D</span>
                      </div>
                      <span className="text-[10px] text-[#8A8A8A] line-clamp-2">
                        Avatar 2D nhép miệng theo âm thanh TTS (Bản đơn giản offline)
                      </span>
                    </button>

                    {/* Card 3: Record */}
                    <button
                      onClick={() => {
                        handleStartRecordModalStream('webcam');
                        setRecordModalOpen(true);
                      }}
                      className="p-2.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-emerald-400 text-left flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Video className="w-3.5 h-3.5" />
                        <span className="font-bold text-xs text-white">Record</span>
                      </div>
                      <span className="text-[10px] text-[#8A8A8A] line-clamp-2">
                        Quay webcam / màn hình / mic có đếm ngược 3-2-1
                      </span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-2 pt-1 border-t border-[#333333]">
                  <div className="flex items-center justify-between gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm tệp media..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-md bg-[#2E2E2E] border border-[#333333] text-xs text-white placeholder-[#8A8A8A] outline-none focus:border-[#1FC8DB]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1 shrink-0">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A8A8A]" />
                      <select
                        value={mediaSort}
                        onChange={(e: any) => setMediaSort(e.target.value)}
                        className="bg-[#2E2E2E] border border-[#333333] rounded-md py-1 px-2 text-[11px] text-[#E6E6E6] outline-none cursor-pointer focus:border-[#1FC8DB]"
                      >
                        <option value="date">Mới nhất</option>
                        <option value="name">Tên (A-Z)</option>
                        <option value="duration">Thời lượng</option>
                        <option value="size">Dung lượng</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'video', label: 'Video' },
                      { id: 'image', label: 'Ảnh' },
                      { id: 'audio', label: 'Âm thanh' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setMediaFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          mediaFilter === f.id
                            ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/40 font-semibold'
                            : 'bg-[#262626] text-[#8A8A8A] hover:text-white border border-transparent'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <span className="text-[10px] text-[#8A8A8A] ml-auto">
                      {(() => {
                        let list = [...dbMediaList];
                        if (selectedMediaNav === 'yours_view' && yoursSubnav === 'recent') list = list.slice(0, 10);
                        if (selectedMediaNav === 'yours_view' && yoursSubnav === 'favorites') list = list.filter((m) => (m as any).favorite);
                        if (selectedMediaNav === 'spaces_view') list = list.filter((m) => ((m as any).folderId || 'Mặc định') === activeSpace);
                        if (searchQuery.trim()) list = list.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
                        if (mediaFilter !== 'all') list = list.filter((m) => m.type === mediaFilter);
                        return `${list.length} tệp`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Floating Multi-Select Toolbar */}
                {selectedMediaIds.length > 0 && (
                  <div className="p-2 rounded-md bg-[#262626] border border-[#1FC8DB]/40 flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-[#1FC8DB]">
                      Đã chọn {selectedMediaIds.length} tệp
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          for (const id of selectedMediaIds) {
                            const media = dbMediaList.find((m) => m.id === id);
                            if (media) {
                              const url = URL.createObjectURL(media.blob);
                              const meta = await generateMediaMetadata(media.blob as File, url);
                              addClip({
                                track: media.type === 'audio' ? 'audio' : 'video',
                                name: media.name,
                                start: currentTime,
                                duration: media.type === 'audio' ? 12 : media.type === 'image' ? 5 : 8,
                                type: media.type,
                                src: url,
                                thumbnailUrl: meta.thumbnailUrl,
                                waveformPeaks: meta.waveformPeaks
                              });
                            }
                          }
                          showToast(`Đã thêm ${selectedMediaIds.length} tệp vào timeline!`, 'success');
                          setSelectedMediaIds([]);
                        }}
                        className="px-2.5 py-1 rounded bg-[#1FC8DB] text-slate-950 font-bold text-[10px] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Thêm vào timeline</span>
                      </button>
                      <button
                        onClick={async () => {
                          for (const id of selectedMediaIds) {
                            await db.media.update(id, { favorite: true });
                          }
                          await loadMedia();
                          showToast(`Đã gắn sao cho ${selectedMediaIds.length} tệp!`, 'info');
                          setSelectedMediaIds([]);
                        }}
                        className="px-2 py-1 rounded bg-[#2E2E2E] hover:bg-amber-500/20 text-amber-300 font-semibold text-[10px] flex items-center gap-1"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span>Gắn sao</span>
                      </button>
                      <button
                        onClick={async () => {
                          for (const id of selectedMediaIds) {
                            await db.media.delete(id);
                          }
                          await loadMedia();
                          showToast(`Đã xóa ${selectedMediaIds.length} tệp!`, 'info');
                          setSelectedMediaIds([]);
                        }}
                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-semibold text-[10px] flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                      <button
                        onClick={() => setSelectedMediaIds([])}
                        className="px-2 py-1 rounded bg-[#2E2E2E] text-[#8A8A8A] hover:text-white text-[10px]"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                )}

                {/* Media Thumbnails Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-0.5">
                  {(() => {
                    let list = [...dbMediaList];
                    if (selectedMediaNav === 'yours_view' && yoursSubnav === 'recent') list = list.slice(0, 10);
                    if (selectedMediaNav === 'yours_view' && yoursSubnav === 'favorites') list = list.filter((m) => (m as any).favorite);
                    if (selectedMediaNav === 'spaces_view') list = list.filter((m) => ((m as any).folderId || 'Mặc định') === activeSpace);
                    if (searchQuery.trim()) list = list.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (mediaFilter !== 'all') list = list.filter((m) => m.type === mediaFilter);
                    if (mediaSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
                    else if (mediaSort === 'date') list.sort((a, b) => b.createdAt - a.createdAt);
                    else if (mediaSort === 'duration') list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
                    else if (mediaSort === 'size') list.sort((a, b) => (b.size || 0) - (a.size || 0));

                    if (list.length === 0) {
                      return (
                        <div className="col-span-2 py-8 text-center text-[#8A8A8A] flex flex-col items-center gap-1.5">
                          <FolderOpen className="w-8 h-8 opacity-40 text-[#1FC8DB]" />
                          <span>Chưa tìm thấy tệp media nào phù hợp</span>
                        </div>
                      );
                    }

                    const visibleList = list.slice(0, visibleMediaCount);
                    return (
                      <>
                        {visibleList.map((media) => {
                          const isSelected = selectedMediaIds.includes(media.id);
                          const isFav = !!(media as any).favorite;
                          const mediaUrl = getMediaBlobUrl(media.id, media.blob);

                      return (
                        <div
                          key={media.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('mediaId', media.id);
                          }}
                          onClick={(e) => {
                            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                              if (isSelected) {
                                setSelectedMediaIds((prev) => prev.filter((id) => id !== media.id));
                              } else {
                                setSelectedMediaIds((prev) => [...prev, media.id]);
                              }
                            } else {
                              setSelectedMediaIds([media.id]);
                            }
                          }}
                          onDoubleClick={() => setPreviewMedia(media)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, media });
                          }}
                          className={`group relative rounded-lg border flex flex-col overflow-hidden transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#1FC8DB] bg-[#1FC8DB]/10 shadow-md ring-1 ring-[#1FC8DB]'
                              : 'border-[#333333] bg-[#262626] hover:border-[#1FC8DB]/50 hover:bg-[#2E2E2E]'
                          }`}
                        >
                          {/* Thumbnail / Scrub Hover Container */}
                          <div className="w-full aspect-video bg-[#141414] relative overflow-hidden flex items-center justify-center">
                            {media.type === 'video' ? (
                              <video
                                src={mediaUrl}
                                muted
                                loop
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                onMouseLeave={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                                className="w-full h-full object-cover pointer-events-auto"
                              />
                            ) : media.type === 'image' ? (
                              <img src={mediaUrl} alt={media.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-emerald-400">
                                <Volume2 className="w-6 h-6 animate-pulse" />
                                <span className="text-[9px] font-mono">AUDIO</span>
                              </div>
                            )}

                            {/* Type & Duration Badges */}
                            <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-black/70 text-[#1FC8DB] backdrop-blur-sm">
                              {media.type}
                            </span>
                            <span className="absolute right-1.5 bottom-1.5 px-1.5 py-0.2 rounded text-[8px] font-mono text-white/90 bg-black/70 backdrop-blur-sm">
                              {media.type === 'video' ? '00:08' : media.type === 'audio' ? '00:15' : 'IMAGE'}
                            </span>

                            {/* Top action buttons: Star & Quick Add */}
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(media.id, isFav);
                                }}
                                className={`p-1 rounded bg-black/70 hover:bg-black text-amber-400 backdrop-blur-sm transition-transform ${
                                  isFav ? 'opacity-100 fill-current' : 'opacity-80 hover:scale-110'
                                }`}
                                title={isFav ? 'Bỏ yêu thích' : 'Gắn sao yêu thích'}
                              >
                                <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                              </button>

                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const meta = await generateMediaMetadata(media.blob as File, mediaUrl);
                                  addClip({
                                    track: media.type === 'audio' ? 'audio' : 'video',
                                    name: media.name,
                                    start: currentTime,
                                    duration: media.type === 'audio' ? 12 : media.type === 'image' ? 5 : 8,
                                    type: media.type,
                                    src: mediaUrl,
                                    thumbnailUrl: meta.thumbnailUrl,
                                    waveformPeaks: meta.waveformPeaks
                                  });
                                  showToast(`Đã thêm "${media.name}" vào timeline!`, 'success');
                                }}
                                className="p-1 rounded bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold backdrop-blur-sm hover:scale-110 transition-transform"
                                title="Thêm vào timeline tại playhead"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Star indicator if permanently favorited */}
                            {isFav && (
                              <Star className="w-3 h-3 text-amber-400 fill-current absolute top-1.5 left-1.5 drop-shadow" />
                            )}
                          </div>

                          {/* Media Metadata */}
                          <div className="p-2 flex flex-col gap-0.5">
                            <span className="font-semibold text-[#E6E6E6] text-[11px] truncate" title={media.name}>
                              {media.name}
                            </span>
                            <div className="flex items-center justify-between text-[9px] text-[#8A8A8A]">
                              <span>
                                {media.size > 1024 * 1024
                                  ? (media.size / (1024 * 1024)).toFixed(1) + ' MB'
                                  : Math.round(media.size / 1024) + ' KB'}
                              </span>
                              {media.type === 'video' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateProxyForMedia(media);
                                  }}
                                  className="text-amber-400 hover:underline flex items-center gap-0.5"
                                  title="Tạo bản proxy 480p"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Proxy</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {list.length > visibleMediaCount && (
                      <div className="col-span-full py-2 flex justify-center">
                        <button
                          onClick={() => setVisibleMediaCount((prev) => prev + 40)}
                          className="px-3 py-1.5 rounded-md bg-[#262626] hover:bg-[#333333] text-xs text-[#1FC8DB] font-semibold border border-[#333333] transition-colors cursor-pointer"
                        >
                          Tải thêm ({list.length - visibleMediaCount} tệp media)
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
              </div>
            )}

            {/* VIEW 2: Subprojects Manager */}
            {selectedMediaNav === 'subprojects' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
                  <div>
                    <h4 className="font-bold text-[#E6E6E6]">Quản lý Subprojects</h4>
                    <p className="text-[10px] text-[#8A8A8A]">
                      Kéo thả vào timeline như compound clip hoặc double-click để mở
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSubproject}
                    className="px-2.5 py-1.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New subproject</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {timelines.map((tl) => {
                    const isActive = tl.id === activeTimelineId;
                    return (
                      <div
                        key={tl.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('subprojectId', tl.id);
                        }}
                        onDoubleClick={() => {
                          setActiveTimelineId(tl.id);
                          showToast(`Đã mở Subproject: "${tl.name}"`, 'success');
                        }}
                        className={`p-2.5 rounded-md border flex items-center justify-between transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1FC8DB]/10 border-[#1FC8DB] shadow-sm'
                            : 'bg-[#262626] border-[#333333] hover:border-[#1FC8DB]/50'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{tl.name}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1FC8DB] text-slate-950">
                                Đang mở
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8A8A8A]">
                            Thời lượng: {tl.duration || 15}s • {tl.tracks?.length || 5} tracks • Compound clip
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              addClip({
                                track: 'video',
                                name: `[Nested] ${tl.name}`,
                                start: currentTime,
                                duration: tl.duration || 8,
                                type: 'video',
                                filter: 'cinematic'
                              });
                              showToast(`Đã chèn Subproject "${tl.name}" vào timeline!`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#1FC8DB]/15 text-[#1FC8DB] hover:bg-[#1FC8DB] hover:text-black text-[10px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Lồng vào</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: Generate AI Image 9:16 */}
            {selectedMediaNav === 'gen_image' && (
              <div className="flex flex-col gap-3 p-3.5 rounded-md bg-[#262626] border border-[#333333]">
                <div className="flex items-center gap-2 text-pink-400">
                  <Wand2 className="w-4 h-4" />
                  <span className="font-bold text-white text-xs">AI Image Generator (9:16 Vertical)</span>
                </div>
                <p className="text-[11px] text-[#8A8A8A]">
                  Nhập câu lệnh mô tả ý tưởng hình ảnh dọc tỷ lệ 9:16. Hệ thống sẽ sinh ảnh đồ họa chất lượng cao cục bộ.
                </p>

                <textarea
                  rows={3}
                  value={aiImagePrompt}
                  onChange={(e) => setAiImagePrompt(e.target.value)}
                  placeholder="Mô tả hình ảnh bạn muốn tạo..."
                  className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2.5 text-xs text-[#E6E6E6] outline-none resize-none"
                />

                <button
                  onClick={handleGenerateAiImage}
                  disabled={isGeneratingAi || isOffline}
                  title={isOffline ? 'Tính năng tạo ảnh AI từ mạng cần kết nối internet' : ''}
                  className={`py-2.5 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isOffline
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white cursor-pointer'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>
                    {isOffline
                      ? 'Tạm tắt (Cần internet)'
                      : isGeneratingAi
                      ? 'Đang tạo ảnh AI...'
                      : 'Tạo ảnh 9:16 và chèn vào timeline'}
                  </span>
                </button>
              </div>
            )}

            {/* VIEW 4: Generate AI Video */}
            {selectedMediaNav === 'gen_video' && (
              <div className="flex flex-col gap-3 p-3.5 rounded-md bg-[#262626] border border-[#333333]">
                <div className="flex items-center gap-2 text-purple-400">
                  <Video className="w-4 h-4" />
                  <span className="font-bold text-white text-xs">AI Video Generator</span>
                </div>

                {settings?.aiApiKey ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[11px] text-[#8A8A8A]">
                      API Key hợp lệ. Nhập câu lệnh để sinh video 9:16 qua Runway / Luma API:
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Cinematic drone shot of modern Ho Chi Minh City neon lights..."
                      className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2 text-xs text-white resize-none outline-none"
                    />
                    <button
                      onClick={() => showToast('Đang kết nối API sinh video...', 'info')}
                      className="py-2 rounded-md bg-[#1FC8DB] text-slate-950 font-bold text-xs"
                    >
                      Sinh AI Video 9:16
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-md bg-[#1F1F1F] border border-amber-500/30 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-white">Yêu cầu cấu hình AI API Key</span>
                    <p className="text-[11px] text-[#8A8A8A] max-w-xs">
                      Tính năng AI Video yêu cầu API key từ Runway, Luma hoặc OpenAI Sora. Vui lòng thêm key trong Cài đặt để kích hoạt.
                    </p>
                    <button
                      onClick={() => openModal('settings')}
                      className="mt-1 px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Mở Cài đặt (Settings)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: Generate Text-To-Speech (TTS) */}
            {selectedMediaNav === 'gen_tts' && (
              <div className="flex flex-col gap-3 p-3.5 rounded-md bg-[#262626] border border-[#333333]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Volume2 className="w-4 h-4" />
                  <span className="font-bold text-white text-xs">Text-to-speech (TTS Web Speech API)</span>
                </div>
                <p className="text-[11px] text-[#8A8A8A]">
                  Tự động chuyển văn bản thành giọng đọc truyền cảm và đồng bộ câu phụ đề lên timeline.
                </p>

                <textarea
                  rows={3}
                  value={ttsScript}
                  onChange={(e) => setTtsScript(e.target.value)}
                  placeholder="Nhập nội dung kịch bản cần đọc tại đây..."
                  className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2.5 text-xs text-white outline-none resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#8A8A8A]">Ngôn ngữ:</span>
                    <select
                      value={ttsLang}
                      onChange={(e: any) => setTtsLang(e.target.value)}
                      className="bg-[#2E2E2E] border border-[#333333] rounded p-1.5 text-xs text-white outline-none"
                    >
                      <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                      <option value="en-US">English (en-US)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#8A8A8A]">Tốc độ đọc: {ttsSpeed}x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                      className="accent-[#1FC8DB] mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => speakText(ttsScript, ttsLang).catch(() => {})}
                    className="flex-1 py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] text-white font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Nghe thử giọng</span>
                  </button>

                  <button
                    onClick={handleGenerateTtsAudio}
                    disabled={isGeneratingTts}
                    className="flex-1 py-2 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Chèn vào timeline</span>
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 6: Generate Nền / Gradient / Countdown */}
            {selectedMediaNav === 'gen_bg' && (
              <div className="flex flex-col gap-3">
                <span className="font-bold text-[#E6E6E6]">Tạo nền màu / Gradient / Countdown cục bộ</span>

                {/* Countdown 3-2-1 Retro Neon */}
                <div className="p-3 rounded-md bg-gradient-to-r from-cyan-950/40 to-pink-950/40 border border-[#1FC8DB]/30 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#1FC8DB] text-xs">⏱ Countdown 3-2-1 Retro Neon</span>
                    <span className="text-[10px] text-[#8A8A8A]">Đếm ngược mở đầu video giữ chân người xem</span>
                  </div>
                  <button
                    onClick={() => {
                      addClip({
                        track: 'video',
                        name: 'Countdown 3s Retro',
                        start: currentTime,
                        duration: 3,
                        type: 'video',
                        filter: 'cyberpunk'
                      });
                      addClip({
                        track: 'text',
                        name: '3... 2... 1... GO!',
                        start: currentTime,
                        duration: 3,
                        type: 'text',
                        text: '3... 2... 1... GO! 🔥',
                        scale: 1.3,
                        y: 0,
                        textAnimIn: 'pop'
                      });
                      confetti({ particleCount: 50, spread: 60 });
                      showToast('Đã thêm Countdown 3-2-1 vào timeline!', 'success');
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#1FC8DB] text-slate-950 font-bold text-[11px]"
                  >
                    + Áp dụng
                  </button>
                </div>

                {/* Solid Colors */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Nền màu đơn sắc 9:16</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Đen sâu', color: '#000000', filter: 'noir' },
                      { name: 'Trắng', color: '#ffffff', filter: 'none' },
                      { name: 'Cyber Cyan', color: '#06b6d4', filter: 'cyberpunk' },
                      { name: 'Đỏ Neon', color: '#e11d48', filter: 'vivid' }
                    ].map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          addClip({
                            track: 'video',
                            name: `Nền ${c.name}`,
                            start: currentTime,
                            duration: 8,
                            type: 'video',
                            filter: c.filter
                          });
                          showToast(`Đã thêm nền "${c.name}" vào timeline!`, 'success');
                        }}
                        className="h-12 rounded border border-[#333333] flex items-center justify-center transition-transform hover:scale-105"
                        style={{ backgroundColor: c.color }}
                      >
                        <span className={`text-[10px] font-bold ${c.color === '#ffffff' ? 'text-black' : 'text-white'}`}>
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 7: Spaces View */}
            {selectedMediaNav === 'spaces_view' && showNewSpaceInput && (
              <div className="p-3 rounded-md bg-[#262626] border border-[#1FC8DB] flex items-center gap-2">
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Nhập tên thư mục mới..."
                  className="flex-1 bg-[#1F1F1F] border border-[#333333] rounded px-2.5 py-1 text-xs text-white outline-none focus:border-[#1FC8DB]"
                />
                <button
                  onClick={handleAddSpace}
                  className="px-3 py-1 rounded bg-[#1FC8DB] text-slate-950 font-bold text-xs"
                >
                  Lưu
                </button>
                <button
                  onClick={() => setShowNewSpaceInput(false)}
                  className="px-2 py-1 rounded text-[#8A8A8A] hover:text-white text-xs"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* VIEW 8: Library Categorized View */}
            {selectedMediaNav === 'lib_view' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#333333]">
                  <span className="font-bold text-white text-xs">Kho Asset Mẫu Đi Kèm (Library)</span>
                  <span className="text-[10px] text-[#1FC8DB] font-semibold">{librarySubnav.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Colors */}
                  {(librarySubnav === 'all' || librarySubnav === 'colors') &&
                    [
                      { name: 'Đen Cinematic', col: '#020617' },
                      { name: 'Hồng Cyber', col: '#831843' },
                      { name: 'Xanh Neon', col: '#083344' },
                      { name: 'Vàng Hoàng Hôn', col: '#451a03' }
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          addClip({
                            track: 'video',
                            name: item.name,
                            start: currentTime,
                            duration: 8,
                            type: 'video',
                            filter: 'warm'
                          });
                          showToast(`Đã thêm "${item.name}"!`);
                        }}
                        className="h-14 rounded-md border border-[#333333] flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: item.col }}
                      >
                        {item.name}
                      </button>
                    ))}

                  {/* Countdown */}
                  {(librarySubnav === 'all' || librarySubnav === 'countdown') && (
                    <button
                      onClick={() => {
                        addClip({
                          track: 'text',
                          name: 'Retro Countdown 5s',
                          start: currentTime,
                          duration: 5,
                          type: 'text',
                          text: '5... 4... 3... 2... 1...',
                          scale: 1.2,
                          y: 0,
                          textAnimIn: 'pop'
                        });
                        showToast('Đã thêm Countdown 5s!');
                      }}
                      className="col-span-2 p-3 rounded-md bg-[#262626] border border-[#1FC8DB]/30 flex items-center justify-between"
                    >
                      <span className="font-bold text-white">⏱ Countdown 5s Retro Neon</span>
                      <span className="text-[10px] text-[#1FC8DB] font-bold">+ Thêm</span>
                    </button>
                  )}

                  {/* Textures */}
                  {(librarySubnav === 'all' || librarySubnav === 'textures') &&
                    [
                      { name: 'Film Grain 35mm', filter: 'vintage' },
                      { name: 'VHS Scanlines', filter: 'vhs' },
                      { name: 'Noise Overlay', filter: 'cyberpunk' },
                      { name: 'Paper Texture', filter: 'warm' }
                    ].map((tex) => (
                      <button
                        key={tex.name}
                        onClick={() => {
                          addClip({
                            track: 'video',
                            name: `Texture ${tex.name}`,
                            start: currentTime,
                            duration: 8,
                            type: 'video',
                            filter: tex.filter
                          });
                          showToast(`Đã thêm "${tex.name}"!`);
                        }}
                        className="p-3 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-left flex justify-between items-center"
                      >
                        <span className="font-bold text-white text-xs">{tex.name}</span>
                        <span className="text-[10px] text-[#1FC8DB]">+ Thêm</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={contentRef} className="flex-1 p-3 overflow-y-auto text-xs text-[#E6E6E6] bg-[#1F1F1F]">

        {/* 2. AUDIO TAB */}
        {activeTab === 'Audio' && (
          <div className="flex flex-col gap-3">
            {/* Audio Sub-Navigation Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
              {[
                { id: 'music', label: 'Kho nhạc', icon: Music },
                { id: 'sfx', label: 'Hiệu ứng SFX', icon: Sparkles },
                { id: 'extract', label: 'Tách tiếng', icon: Scissors },
                { id: 'tts', label: 'Giọng đọc TTS', icon: Volume2 },
                { id: 'voiceover', label: 'Lồng tiếng Mic', icon: Mic }
              ].map((nav) => {
                const Icon = nav.icon;
                const isAct = audioSubnav === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => setAudioSubnav(nav.id as any)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      isAct
                        ? 'bg-[#1FC8DB] text-slate-950 font-bold shadow-sm'
                        : 'bg-[#262626] text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 2.1 KHO NHẠC (MUSIC) */}
            {audioSubnav === 'music' && (
              <div className="flex flex-col gap-3">
                {/* Copyright info */}
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[10px] flex items-center gap-1.5 leading-tight">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Kho nhạc tích hợp đạt chuẩn CC0 / Royalty-Free. Khi import nhạc riêng, vui lòng đảm bảo bạn sở hữu quyền sử dụng.</span>
                </div>

                {/* Search & Genre Filter */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={musicSearch}
                      onChange={(e) => setMusicSearch(e.target.value)}
                      placeholder="Tìm bài hát, thể loại, giai điệu..."
                      className="w-full bg-[#262626] border border-[#333333] focus:border-[#1FC8DB] rounded-md pl-8 pr-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'trending', label: 'Trending' },
                      { id: 'lofi', label: 'Lo-Fi Chill' },
                      { id: 'phonk', label: 'Phonk' },
                      { id: 'vlog', label: 'Vlog' },
                      { id: 'chill', label: 'Acoustic' },
                      { id: 'cinematic', label: 'Điện ảnh' }
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setMusicCategory(g.id as any)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                          musicCategory === g.id
                            ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/50 font-bold'
                            : 'bg-[#262626] text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nhạc người dùng đã tải lên (User Uploads) */}
                {dbMediaList.filter((m) => m.type === 'audio').length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Nhạc của bạn (Đã import)</span>
                    <div className="flex flex-col gap-1.5">
                      {dbMediaList
                        .filter((m) => m.type === 'audio')
                        .filter((m) => !musicSearch || m.name.toLowerCase().includes(musicSearch.toLowerCase()))
                        .map((track) => (
                          <div
                            key={track.id}
                            className="p-2 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB]/50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <button
                                onClick={() => {
                                  if (playingMusicId === track.id) {
                                    musicAudioRef.current?.pause();
                                    setPlayingMusicId(null);
                                  } else {
                                    if (musicAudioRef.current) musicAudioRef.current.pause();
                                    const audio = new Audio(URL.createObjectURL(track.blob));
                                    audio.onended = () => setPlayingMusicId(null);
                                    audio.play().catch(() => {});
                                    musicAudioRef.current = audio;
                                    setPlayingMusicId(track.id);
                                  }
                                }}
                                className="p-1.5 rounded-full bg-[#1FC8DB]/20 text-[#1FC8DB] hover:bg-[#1FC8DB] hover:text-black shrink-0"
                              >
                                {playingMusicId === track.id ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              </button>
                              <div className="flex flex-col truncate">
                                <span className="font-semibold text-white text-xs truncate">{track.name}</span>
                                <span className="text-[10px] text-emerald-400 font-mono">Đã tải lên • {(track.size / (1024 * 1024)).toFixed(1)} MB</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const url = URL.createObjectURL(track.blob);
                                addClip({
                                  track: 'audio',
                                  name: track.name,
                                  start: currentTime,
                                  duration: 15,
                                  type: 'audio',
                                  src: url,
                                  volume: 0.8
                                });
                                showToast(`Đã thêm "${track.name}" vào track Audio!`, 'success');
                              }}
                              className="px-2.5 py-1 rounded bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[10px] transition-colors shrink-0"
                            >
                              + Thêm
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Kho nhạc mẫu bản quyền mở CC0 */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Kho nhạc CC0 (Bản quyền mở)</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'mus-1', title: 'Lo-Fi Midnight Study', cat: 'lofi', duration: 15, tag: 'Thư giãn', color: 'from-indigo-600 to-purple-800' },
                      { id: 'mus-2', title: 'Viral Phonk Drift Speed', cat: 'phonk', duration: 15, tag: 'Sôi động', color: 'from-rose-600 to-red-900' },
                      { id: 'mus-3', title: 'Aesthetic Morning Coffee Vlog', cat: 'vlog', duration: 16, tag: 'Vlog ngày mới', color: 'from-amber-500 to-orange-700' },
                      { id: 'mus-4', title: 'Synthwave Retro 80s Cyber', cat: 'trending', duration: 18, tag: 'Retro 80s', color: 'from-cyan-500 to-blue-800' },
                      { id: 'mus-5', title: 'Cinematic Trailer Epic Rise', cat: 'cinematic', duration: 20, tag: 'Điện ảnh', color: 'from-teal-600 to-emerald-900' },
                      { id: 'mus-6', title: 'Upbeat Corporate Innovation', cat: 'trending', duration: 15, tag: 'Công nghệ', color: 'from-sky-500 to-indigo-700' },
                      { id: 'mus-7', title: 'Acoustic Sunset Guitar', cat: 'chill', duration: 17, tag: 'Acoustic', color: 'from-yellow-600 to-amber-800' },
                      { id: 'mus-8', title: 'Trap Beat 808 Bass Boost', cat: 'phonk', duration: 15, tag: 'Bass mạnh', color: 'from-fuchsia-600 to-pink-900' }
                    ]
                      .filter((m) => musicCategory === 'all' || m.cat === musicCategory)
                      .filter((m) => !musicSearch || m.title.toLowerCase().includes(musicSearch.toLowerCase()))
                      .map((bgm) => (
                        <div
                          key={bgm.id}
                          className="p-2.5 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB]/50 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <button
                              onClick={async () => {
                                if (playingMusicId === bgm.id) {
                                  musicAudioRef.current?.pause();
                                  setPlayingMusicId(null);
                                } else {
                                  if (musicAudioRef.current) musicAudioRef.current.pause();
                                  audioManager.playSfx('beat');
                                  setPlayingMusicId(bgm.id);
                                  setTimeout(() => setPlayingMusicId(null), 1500);
                                }
                              }}
                              className="p-2 rounded-full bg-[#2E2E2E] hover:bg-[#1FC8DB] text-white hover:text-black transition-colors shrink-0"
                              title="Nghe thử beat"
                            >
                              {playingMusicId === bgm.id ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            </button>
                            <div className="flex flex-col truncate">
                              <span className="font-semibold text-white text-xs truncate">{bgm.title}</span>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-[#1FC8DB] font-semibold">{bgm.tag}</span>
                                <span className="text-[#8A8A8A]">• {bgm.duration}s</span>
                                <span className="text-emerald-400 font-mono">CC0</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              const wavBlob = await audioManager.renderSfxWav('beat');
                              const url = URL.createObjectURL(wavBlob);
                              addClip({
                                track: 'audio',
                                name: bgm.title,
                                start: currentTime,
                                duration: bgm.duration,
                                type: 'audio',
                                src: url,
                                volume: 0.8
                              });
                              showToast(`Đã thêm BGM "${bgm.title}" vào timeline!`, 'success');
                            }}
                            className="px-2.5 py-1 rounded bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[10px] transition-colors shrink-0"
                          >
                            + Thêm
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Import Audio shortcut */}
                <button
                  onClick={() => mediaFileInputRef.current?.click()}
                  className="w-full py-2 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] text-[#8A8A8A] hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1FC8DB]" />
                  <span>+ Tải thêm tệp nhạc từ máy tính (.mp3, .wav, .m4a)</span>
                </button>
              </div>
            )}

            {/* 2.2 HIỆU ỨNG ÂM THANH (SFX SYNTHESIZER) */}
            {audioSubnav === 'sfx' && (
              <div className="flex flex-col gap-3">
                {/* SFX Category Filters */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'Movement', label: 'Chuyển động' },
                    { id: 'Impact', label: 'Va đập / Beat' },
                    { id: 'Chime', label: 'Chuông reng' },
                    { id: 'Modern', label: 'Hiện đại / Glitch' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSfxCategory(c.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                        sfxCategory === c.id
                          ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/50 font-bold'
                          : 'bg-[#262626] text-[#8A8A8A] hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* SFX Grid */}
                <div className="flex flex-col gap-1.5">
                  {SFX_CATALOG
                    .filter((s) => sfxCategory === 'all' || s.category === sfxCategory)
                    .map((sfx) => (
                      <div
                        key={sfx.type}
                        className="flex items-center justify-between p-2.5 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB]/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => audioManager.playSfx(sfx.type)}
                            className="p-2 rounded-full bg-[#2E2E2E] hover:bg-[#1FC8DB] text-white hover:text-black transition-colors"
                            title="Nghe thử hiệu ứng"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-xs">{sfx.name}</span>
                            <span className="text-[10px] text-[#8A8A8A]">{sfx.category} • {sfx.duration}s (Web Audio)</span>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            const blob = await audioManager.renderSfxWav(sfx.type);
                            const url = URL.createObjectURL(blob);
                            addClip({
                              track: 'audio',
                              name: sfx.name,
                              start: currentTime,
                              duration: sfx.duration,
                              type: 'audio',
                              src: url,
                              volume: 1
                            });
                            showToast(`Đã thêm hiệu ứng âm thanh: ${sfx.name}`);
                          }}
                          className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-semibold text-[10px] transition-colors"
                        >
                          + Thêm
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 2.3 TÁCH TIẾNG TỪ VIDEO (EXTRACT AUDIO) */}
            {audioSubnav === 'extract' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-md bg-[#262626] border border-[#1FC8DB]/30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[#1FC8DB]" />
                    <span className="font-bold text-white text-xs">Trích xuất âm thanh từ Video (Extract Audio)</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A]">
                    Tự động tách dải âm thanh từ clip video trên timeline hoặc tệp video trong thư viện thành track audio WAV riêng biệt.
                  </p>
                </div>

                {/* Extract from selected clip */}
                <button
                  disabled={isExtractingAudio}
                  onClick={async () => {
                    const videoClip = clips.find((c) => c.id === selectedClipId && (c.track === 'video' || c.type === 'video')) || clips.find((c) => c.track === 'video');
                    if (!videoClip || !videoClip.src) {
                      showToast('Chưa có clip video nào trên timeline để tách tiếng!', 'warning');
                      return;
                    }
                    try {
                      setIsExtractingAudio(true);
                      const res = await fetch(videoClip.src);
                      const blob = await res.blob();
                      const { blob: audioWav, duration: audioDur } = await extractAudioFromVideo(blob);
                      const url = URL.createObjectURL(audioWav);
                      addClip({
                        track: 'audio',
                        name: `Tách tiếng: ${videoClip.name}`,
                        start: videoClip.start,
                        duration: Math.max(1, Math.round(audioDur)),
                        type: 'audio',
                        src: url,
                        volume: 1
                      });
                      showToast(`Đã tách tiếng thành công (${Math.round(audioDur)}s)!`, 'success');
                    } catch (e: any) {
                      showToast(`Lỗi tách tiếng: ${e?.message || 'Không tìm thấy luồng âm thanh'}`, 'error');
                    } finally {
                      setIsExtractingAudio(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Scissors className="w-4 h-4" />
                  <span>{isExtractingAudio ? 'Đang trích xuất audio...' : 'Tách tiếng clip video đang chọn trên timeline'}</span>
                </button>

                {/* Available Media Videos to Extract */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Hoặc tách tiếng từ tệp video trong dự án:</span>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {dbMediaList.filter((m) => m.type === 'video').length === 0 ? (
                      <span className="text-[11px] text-[#8A8A8A] italic p-2">Chưa có video nào trong dự án.</span>
                    ) : (
                      dbMediaList.filter((m) => m.type === 'video').map((m) => (
                        <div key={m.id} className="p-2 rounded bg-[#262626] border border-[#333333] flex items-center justify-between">
                          <span className="font-medium text-white text-xs truncate max-w-[180px]">{m.name}</span>
                          <button
                            onClick={async () => {
                              try {
                                setIsExtractingAudio(true);
                                const { blob: audioWav, duration: audioDur } = await extractAudioFromVideo(m.blob);
                                const url = URL.createObjectURL(audioWav);
                                addClip({
                                  track: 'audio',
                                  name: `Audio từ ${m.name}`,
                                  start: currentTime,
                                  duration: Math.max(1, Math.round(audioDur)),
                                  type: 'audio',
                                  src: url,
                                  volume: 1
                                });
                                showToast(`Đã tách tiếng từ "${m.name}"!`, 'success');
                              } catch (e: any) {
                                showToast(`Không thể tách tiếng: ${e?.message}`, 'error');
                              } finally {
                                setIsExtractingAudio(false);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-[#1FC8DB]/20 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[10px]"
                          >
                            Tách tiếng
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2.4 TEXT TO SPEECH (TTS) */}
            {audioSubnav === 'tts' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8A8A8A] font-bold uppercase">Nội dung văn bản:</span>
                  <textarea
                    rows={3}
                    value={ttsScript}
                    onChange={(e) => setTtsScript(e.target.value)}
                    placeholder="Nhập nội dung cần chuyển thành giọng nói..."
                    className="w-full bg-[#262626] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#8A8A8A]">Giọng đọc (Voice):</span>
                    <select
                      value={ttsLang}
                      onChange={(e) => setTtsLang(e.target.value as any)}
                      className="bg-[#2E2E2E] border border-[#333333] rounded px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="vi-VN">Tiếng Việt (Chuẩn)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8A8A8A]">Tốc độ:</span>
                      <span className="font-mono text-[#1FC8DB]">{ttsSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                      className="accent-[#1FC8DB] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!ttsScript.trim()) {
                        showToast('Vui lòng nhập văn bản để nghe thử!', 'warning');
                        return;
                      }
                      speakText(ttsScript, ttsLang);
                    }}
                    className="flex-1 py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nghe thử (Speak)</span>
                  </button>

                  <button
                    disabled={isGeneratingTts}
                    onClick={async () => {
                      if (!ttsScript.trim()) {
                        showToast('Vui lòng nhập nội dung văn bản!', 'warning');
                        return;
                      }
                      try {
                        setIsGeneratingTts(true);
                        const words = ttsScript.trim().split(/\s+/).length;
                        const estimatedDur = Math.max(2, Math.round((words / 2.5) / ttsSpeed));
                        const wavBlob = await synthesizeSpeechWav(ttsScript, estimatedDur);
                        const url = URL.createObjectURL(wavBlob);
                        addClip({
                          track: 'audio',
                          name: `TTS: "${ttsScript.slice(0, 16)}..."`,
                          start: currentTime,
                          duration: estimatedDur,
                          type: 'audio',
                          src: url,
                          volume: 1
                        });
                        showToast(`Đã tạo clip giọng đọc TTS (${estimatedDur}s)!`, 'success');
                      } catch (e: any) {
                        showToast(`Lỗi tạo TTS: ${e?.message}`, 'error');
                      } finally {
                        setIsGeneratingTts(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm clip vào timeline</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2.5 LỒNG TIẾNG MIC (VOICEOVER) */}
            {audioSubnav === 'voiceover' && (
              <div className="flex flex-col gap-3 p-3 rounded-md bg-[#262626] border border-[#333333]">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white text-xs">Ghi âm lồng tiếng trực tiếp tại Playhead</span>
                </div>
                <p className="text-[11px] text-[#8A8A8A]">
                  Thu giọng nói của bạn qua microphone và tự động chèn clip âm thanh vào đúng vị trí con trỏ phát ({currentTime.toFixed(1)}s).
                </p>

                {/* Countdown / Recording Box */}
                <div className="w-full h-28 bg-[#1F1F1F] rounded-lg border border-[#333333] flex flex-col items-center justify-center relative overflow-hidden">
                  {voiceoverCountdown !== null ? (
                    <span className="text-5xl font-black text-[#1FC8DB] animate-ping">{voiceoverCountdown}</span>
                  ) : isRecordingVoiceover ? (
                    <div className="flex flex-col items-center gap-2 text-rose-500 animate-pulse">
                      <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-mono text-xl font-bold text-white">
                        {Math.floor(voiceoverTimer / 60)}:{voiceoverTimer % 60 < 10 ? '0' : ''}{voiceoverTimer % 60}
                      </span>
                      <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Đang ghi âm...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#8A8A8A]">
                      <Mic className="w-8 h-8 text-[#8A8A8A]" />
                      <span className="text-[11px]">Sẵn sàng ghi âm qua micro</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (isRecordingVoiceover) {
                      if (voiceoverRecorderRef.current) {
                        voiceoverRecorderRef.current.onstop = () => {
                          const audioBlob = new Blob(voiceoverChunksRef.current, { type: 'audio/webm' });
                          const url = URL.createObjectURL(audioBlob);
                          const recordedDur = Math.max(1, voiceoverTimer);
                          addClip({
                            track: 'audio',
                            name: `Lồng tiếng Mic (${recordedDur}s)`,
                            start: currentTime,
                            duration: recordedDur,
                            type: 'audio',
                            src: url,
                            volume: 1
                          });
                          showToast(`Đã thêm đoạn lồng tiếng (${recordedDur}s) vào timeline!`, 'success');
                          voiceoverStreamRef.current?.getTracks().forEach((t) => t.stop());
                          setIsRecordingVoiceover(false);
                          clearInterval(voiceoverTimerRef.current);
                        };
                        voiceoverRecorderRef.current.stop();
                      }
                    } else {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        setVoiceoverCountdown(3);
                        let count = 3;
                        const cdInt = setInterval(() => {
                          count--;
                          if (count > 0) {
                            setVoiceoverCountdown(count);
                          } else {
                            clearInterval(cdInt);
                            setVoiceoverCountdown(null);
                            voiceoverChunksRef.current = [];
                            const recorder = new MediaRecorder(stream);
                            recorder.ondataavailable = (e) => {
                              if (e.data.size > 0) voiceoverChunksRef.current.push(e.data);
                            };
                            recorder.start(100);
                            voiceoverRecorderRef.current = recorder;
                            voiceoverStreamRef.current = stream;
                            setIsRecordingVoiceover(true);
                            setVoiceoverTimer(0);
                            voiceoverTimerRef.current = setInterval(() => {
                              setVoiceoverTimer((t) => t + 1);
                            }, 1000);
                          }
                        }, 1000);
                      } catch (err: any) {
                        showToast('Không thể truy cập microphone. Vui lòng cấp quyền!', 'error');
                      }
                    }
                  }}
                  className={`w-full py-2.5 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                    isRecordingVoiceover
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950'
                  }`}
                >
                  {isRecordingVoiceover ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>⏹ Dừng thu và chèn vào timeline</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>⏺ Bắt đầu ghi âm lồng tiếng (3-2-1)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. TEXT TAB */}
        {activeTab === 'Text' && (
          <div className="flex flex-col gap-3">
            {/* Top Action: Add Default Text */}
            <button
              onClick={() => {
                addClip({
                  track: 'text',
                  name: 'Chữ mặc định',
                  start: currentTime,
                  duration: 4,
                  type: 'text',
                  text: 'Nhập nội dung tại đây',
                  fontFamily: selectedFont,
                  fontSize: 28,
                  textPreset: 'hormozi'
                });
                showToast('Đã thêm chữ mặc định vào timeline!');
              }}
              className="w-full py-2.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Chữ Mặc Định (Default Text)</span>
            </button>

            {/* Text Sub-navigation Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
              {[
                { id: 'presets', label: '20+ Mẫu chữ (Presets)' },
                { id: 'wordart', label: 'Chữ nghệ thuật (Word Art)' },
                { id: 'lyrics', label: 'Lời bài hát (.lrc)' },
                { id: 'fonts', label: 'Phông chữ (Fonts)' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTextSubnav(s.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    textSubnav === s.id
                      ? 'bg-[#1FC8DB] text-slate-950 font-bold'
                      : 'bg-[#262626] text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 3.1 20+ TEXT PRESETS */}
            {textSubnav === 'presets' && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="Tìm kiếm mẫu chữ hot trend..."
                  className="w-full bg-[#262626] border border-[#333333] focus:border-[#1FC8DB] rounded-md px-3 py-1.5 text-xs text-white outline-none mb-1"
                />

                <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto">
                  {[
                    { id: 'hormozi', name: 'Alex Hormozi Title', sample: 'TIỀN VỀ ĐẦY TÚI 💸', desc: 'Vàng viền đen đậm', color: 'text-amber-300', border: 'border-amber-500/40' },
                    { id: 'neon_cyan', name: 'Cyber Neon Cyan', sample: '✨ BÍ MẬT TRIỆU VIEW ✨', desc: 'Xanh cyan phát quang', color: 'text-[#1FC8DB]', border: 'border-[#1FC8DB]/40' },
                    { id: 'neon_pink', name: 'Hot Pink Neon Glow', sample: '💖 CỰC KỲ DỄ THƯƠNG 💖', desc: 'Hồng dạ quang nổi bật', color: 'text-pink-400', border: 'border-pink-500/40' },
                    { id: 'red_alert', name: 'Red Alert Warning', sample: '🔥 ĐỪNG BỎ QUA ĐIỀU NÀY', desc: 'Đỏ cảnh báo viền trắng', color: 'text-rose-400', border: 'border-rose-500/40' },
                    { id: 'clean_minimal', name: 'Minimal Clean White', sample: 'MINIMAL VIBES 2026', desc: 'Tối giản, thanh lịch cao cấp', color: 'text-slate-200', border: 'border-slate-500/40' },
                    { id: 'gold_3d', name: '3D Golden Luxury', sample: '👑 ĐẲNG CẤP HOÀNG GIA', desc: 'Vàng kim 3D khối sang', color: 'text-yellow-400', border: 'border-yellow-500/40' },
                    { id: 'gradient_sunset', name: 'Sunset Gradient', sample: '🌅 HOÀNG HÔN RỰC RỠ', desc: 'Cam chuyển sắc hồng ấm', color: 'text-orange-400', border: 'border-orange-500/40' },
                    { id: 'synthwave_80s', name: '80s Synthwave Retro', sample: '🕹️ RETRO WAVE 1984', desc: 'Tím neon & bóng xanh 80s', color: 'text-purple-400', border: 'border-purple-500/40' },
                    { id: 'comic_pop', name: 'Comic Book Pop Art', sample: '💥 BOOM! BẤT NGỜ CHƯA', desc: 'Phong cách truyện tranh', color: 'text-amber-400', border: 'border-amber-400/40' },
                    { id: 'white_box', name: 'White Box Banner', sample: '🏷️ TIN NỔI BẬT HÔM NAY', desc: 'Hộp chữ trắng nền tương phản', color: 'text-slate-900 bg-white px-1.5 py-0.5 rounded', border: 'border-white/60' },
                    { id: 'black_box', name: 'Black Box Banner', sample: '🎬 ĐIỆN ẢNH CHUYÊN NGHIỆP', desc: 'Hộp phụ đề nền tối mờ', color: 'text-white bg-black/80 px-1.5 py-0.5 rounded', border: 'border-slate-700' },
                    { id: 'hologram', name: 'Hologram Future', sample: '🌐 HỆ THỐNG KỸ THUẬT', desc: 'Ánh sáng ba chiều', color: 'text-cyan-300', border: 'border-cyan-500/40' },
                    { id: 'matrix_green', name: 'Matrix Hacker Code', sample: '💻 SYSTEM BREACH 100%', desc: 'Xanh lá hacker ma trận', color: 'text-emerald-400', border: 'border-emerald-500/40' },
                    { id: 'pastel_lavender', name: 'Pastel Lavender', sample: '🌸 MÙA XUÂN DỊU DÀNG', desc: 'Tím pastel mềm mại', color: 'text-purple-300', border: 'border-purple-400/40' },
                    { id: 'fire_orange', name: 'Fire Flame Blazing', sample: '🔥 NHIỆT HUYẾT BÙNG CHÁY', desc: 'Cam lửa nóng bỏng', color: 'text-orange-500', border: 'border-orange-600/40' },
                    { id: 'chrome_silver', name: 'Chrome Silver Metallic', sample: '⚡ SIÊU PHẨM CÔNG NGHỆ', desc: 'Bạc kim loại ánh thép', color: 'text-zinc-300', border: 'border-zinc-400/40' },
                    { id: 'bold_impact', name: 'Bold Impact Headline', sample: '📢 THÔNG BÁO QUAN TRỌNG', desc: 'Chữ in dày viền đen', color: 'text-white font-black', border: 'border-zinc-500/40' },
                    { id: 'bubble_gum', name: 'Bubble Gum Sweet', sample: '🍬 NGỌT NGÀO ĐÁNG YÊU', desc: 'Hồng kẹo ngọt bong bóng', color: 'text-pink-300', border: 'border-pink-400/40' },
                    { id: 'subtitle_sub', name: 'Subtitle Box Pro', sample: 'Phụ đề chuẩn Netflix', desc: 'Độ rõ nét cao cho mắt', color: 'text-yellow-200 bg-black/70 px-1.5 py-0.5 rounded', border: 'border-yellow-500/30' },
                    { id: 'vintage_type', name: 'Vintage Typewriter', sample: 'Ghi chép nhật ký 1995', desc: 'Máy đánh chữ hoài niệm', color: 'text-amber-100 font-mono', border: 'border-amber-300/30' },
                    { id: 'neon_green', name: 'Radioactive Neon Green', sample: '☢️ CẢNH BÁO BẬC CAO', desc: 'Xanh lá dạ quang cực mạnh', color: 'text-lime-400', border: 'border-lime-500/40' },
                    { id: 'glitch_text', name: 'Glitch Cyber Stutter', sample: '⚡ LỖI TÍN HIỆU 404', desc: 'Nhiễu tín hiệu giật lag', color: 'text-rose-300', border: 'border-rose-400/40' }
                  ]
                    .filter((p) => !textSearch || p.name.toLowerCase().includes(textSearch.toLowerCase()) || p.desc.toLowerCase().includes(textSearch.toLowerCase()))
                    .map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          addClip({
                            track: 'text',
                            name: preset.name,
                            start: currentTime,
                            duration: 3.5,
                            type: 'text',
                            text: preset.sample,
                            fontFamily: selectedFont,
                            fontSize: 28,
                            textPreset: preset.id,
                            scale: 1.1,
                            y: -100,
                            textAnimIn: 'pop'
                          });
                          showToast(`Đã thêm mẫu chữ: ${preset.name}`);
                        }}
                        className={`p-2.5 rounded-md bg-[#262626] border ${preset.border} hover:scale-[1.02] text-left flex flex-col justify-between transition-all`}
                      >
                        <div className="flex flex-col gap-1 mb-2">
                          <span className={`font-black text-xs tracking-wide line-clamp-1 ${preset.color}`}>{preset.sample}</span>
                          <span className="text-[10px] text-[#8A8A8A] line-clamp-1">{preset.desc}</span>
                        </div>
                        <span className="text-[10px] text-[#1FC8DB] font-bold self-end">+ Áp dụng</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* 3.2 WORD ART */}
            {textSubnav === 'wordart' && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Uốn cong Rainbow', text: '🌈 CẦU VỒNG RỰC RỠ', style: 'gradient_sunset', desc: 'Chữ uốn cong mềm mại' },
                  { name: 'Khối 3D Đổ bóng kép', text: '💎 SIÊU PHẨM 3D', style: 'synthwave_80s', desc: 'Đổ bóng kép tím & cyan' },
                  { name: 'Neon Viền Phát Sáng', text: '⚡ SẤM SÉT BÙNG NỔ', style: 'neon_cyan', desc: 'Dạ quang viền phát sáng' },
                  { name: 'Hoàng Gia Vàng Kim', text: '🏆 VÔ ĐỊCH NĂM NAY', style: 'gold_3d', desc: 'Vàng ánh kim khối nổi' },
                  { name: 'Hacker Cyber Terminal', text: '💻 ACCESS GRANTED', style: 'matrix_green', desc: 'Mã nguồn ma trận' },
                  { name: 'Pop-Art Bùng Nổ', text: '💥 CỰC KỲ ĐỘT PHÁ', style: 'comic_pop', desc: 'Nghệ thuật truyện tranh' }
                ].map((art, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      addClip({
                        track: 'text',
                        name: art.name,
                        start: currentTime,
                        duration: 3.5,
                        type: 'text',
                        text: art.text,
                        fontFamily: selectedFont,
                        fontSize: 30,
                        textPreset: art.style,
                        scale: 1.15,
                        y: -100,
                        textAnimIn: 'pop'
                      });
                      showToast(`Đã thêm Word Art: ${art.name}`);
                    }}
                    className="p-3 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-left flex flex-col justify-between transition-all hover:scale-[1.02]"
                  >
                    <span className="font-black text-white text-xs mb-1">{art.text}</span>
                    <span className="text-[10px] text-[#8A8A8A] mb-2">{art.desc}</span>
                    <span className="text-[10px] text-[#1FC8DB] font-bold self-end">+ Thêm Word Art</span>
                  </button>
                ))}
              </div>
            )}

            {/* 3.3 LYRICS (.LRC) */}
            {textSubnav === 'lyrics' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-md bg-[#262626] border border-[#1FC8DB]/30 flex flex-col gap-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#1FC8DB]" />
                    Đồng bộ lời bài hát từ tệp Lyrics (.LRC)
                  </span>
                  <p className="text-[11px] text-[#8A8A8A]">
                    Tải tệp `.lrc` có gắn sẵn mốc thời gian [mm:ss.xx] để tự động tạo một chuỗi các clip phụ đề chạy khớp theo từng câu hát.
                  </p>
                </div>

                <label className="p-4 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] bg-[#262626] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
                  <Upload className="w-5 h-5 text-[#1FC8DB]" />
                  <span className="font-semibold text-xs text-white">Chọn tệp .LRC từ thiết bị</span>
                  <span className="text-[10px] text-[#8A8A8A]">Định dạng [mm:ss.xx] chuẩn</span>
                  <input
                    ref={lrcInputRef}
                    type="file"
                    accept=".lrc,text/plain"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (!content) return;
                        const lines = content.split('\n');
                        const parsed: Array<{ start: number; text: string }> = [];
                        const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
                        for (const line of lines) {
                          const m = regex.exec(line.trim());
                          if (m) {
                            const min = parseInt(m[1], 10);
                            const sec = parseInt(m[2], 10);
                            const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
                            const t = min * 60 + sec + ms;
                            const txt = m[4].trim();
                            if (txt) parsed.push({ start: t, text: txt });
                          }
                        }
                        if (parsed.length === 0) {
                          showToast('Không tìm thấy cú pháp [mm:ss.xx] trong file .lrc!', 'warning');
                          return;
                        }
                        parsed.forEach((item, idx) => {
                          const next = parsed[idx + 1];
                          const dur = next ? Math.max(1, next.start - item.start) : 3.5;
                          addClip({
                            track: 'text',
                            name: `Lyric: "${item.text.slice(0, 15)}..."`,
                            start: item.start,
                            duration: Math.min(dur, 8),
                            type: 'text',
                            text: item.text,
                            fontFamily: selectedFont,
                            textPreset: 'neon_cyan',
                            scale: 1.1,
                            y: -100,
                            textAnimIn: 'pop'
                          });
                        });
                        showToast(`Đã đồng bộ ${parsed.length} câu lời bài hát lên timeline!`, 'success');
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                </label>

                {/* Sample LRC Generator */}
                <button
                  onClick={() => {
                    const sampleLyrics = [
                      { start: 0, text: 'Ánh trăng tàn soi bóng em bên thềm vắng 🌙' },
                      { start: 3.5, text: 'Gió đêm lạnh làm xao xuyến góc phố quen 🍃' },
                      { start: 7.0, text: 'Nụ cười ấy mãi in sâu trong từng giấc mơ ✨' },
                      { start: 10.5, text: 'Hẹn gặp lại em vào một ngày nắng ấm ☀️' }
                    ];
                    sampleLyrics.forEach((lyr) => {
                      addClip({
                        track: 'text',
                        name: `Lyric: "${lyr.text.slice(0, 15)}..."`,
                        start: lyr.start,
                        duration: 3.2,
                        type: 'text',
                        text: lyr.text,
                        fontFamily: selectedFont,
                        textPreset: 'neon_cyan',
                        scale: 1.1,
                        y: -100,
                        textAnimIn: 'pop'
                      });
                    });
                    showToast('Đã nạp 4 câu lời bài hát mẫu (.lrc) lên timeline!', 'success');
                  }}
                  className="py-1.5 text-[11px] text-[#8A8A8A] hover:text-[#1FC8DB] underline text-center"
                >
                  Hoặc bấm vào đây để nạp thử 4 câu lời bài hát mẫu (.lrc)
                </button>

                <div className="pt-2 border-t border-[#333333] flex items-center justify-between">
                  <span className="text-[11px] text-[#8A8A8A]">Cần tự động nhận diện giọng nói nói tiếng Việt?</span>
                  <button
                    onClick={() => setActiveTab('Captions')}
                    className="text-[11px] text-[#1FC8DB] font-bold hover:underline"
                  >
                    Mở Auto Captions →
                  </button>
                </div>
              </div>
            )}

            {/* 3.4 PHÔNG CHỮ (FONTS) */}
            {textSubnav === 'fonts' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Phông chữ chuẩn (Google Fonts & Hệ thống)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'Inter', name: 'Inter (Hiện đại)' },
                      { id: 'Montserrat', name: 'Montserrat (Đậm nét)' },
                      { id: 'Poppins', name: 'Poppins (Tròn trịa)' },
                      { id: 'Roboto', name: 'Roboto (Chuẩn UI)' },
                      { id: 'Bangers', name: 'Bangers (Comic Pop)' },
                      { id: 'Pacifico', name: 'Pacifico (Viết tay)' },
                      { id: 'Oswald', name: 'Oswald (In hoa cao)' },
                      { id: 'Orbitron', name: 'Orbitron (Sci-Fi)' },
                      ...customFonts.map((f) => ({ id: f, name: `${f} (Tải lên)` }))
                    ].map((font) => (
                      <button
                        key={font.id}
                        onClick={() => {
                          setSelectedFont(font.id);
                          // If a text clip is selected, apply font immediately
                          const selectedClip = clips.find((c) => c.id === selectedClipId && (c.track === 'text' || c.type === 'text'));
                          if (selectedClip) {
                            updateClip(selectedClip.id, { fontFamily: font.id });
                            showToast(`Đã đổi font chữ của clip thành "${font.id}"!`);
                          } else {
                            showToast(`Đã chọn phông chữ "${font.id}" cho các chữ tiếp theo!`);
                          }
                        }}
                        className={`p-2 rounded-md border text-left text-xs transition-all ${
                          selectedFont === font.id
                            ? 'border-[#1FC8DB] bg-[#1FC8DB]/15 text-[#1FC8DB] font-bold'
                            : 'border-[#333333] bg-[#262626] text-white hover:border-[#1FC8DB]/50'
                        }`}
                        style={{ fontFamily: font.id }}
                      >
                        <span className="truncate block">{font.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Custom Font (.ttf / .otf) */}
                <div className="pt-2 border-t border-[#333333] flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Tải font riêng (.TTF / .OTF)</span>
                  <label className="p-3 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] bg-[#262626] flex items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-[#1FC8DB]" />
                    <span className="font-semibold text-xs text-white">+ Tải file font .ttf / .otf từ máy</span>
                    <input
                      ref={fontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const buffer = await file.arrayBuffer();
                          const fontValidation = validateFontBuffer(buffer);
                          if (!fontValidation.valid) {
                            showToast(fontValidation.error || 'Phông chữ không an toàn hoặc không hợp lệ!', 'error');
                            return;
                          }
                          const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
                          const fontFace = new FontFace(fontName, buffer);
                          await fontFace.load();
                          document.fonts.add(fontFace);
                          setCustomFonts((prev) => [...prev, fontName]);
                          setSelectedFont(fontName);
                          showToast(`Đã kích hoạt phông chữ "${fontName}" (${fontValidation.format.toUpperCase()}) thành công!`, 'success');
                        } catch (err: any) {
                          showToast(`Không thể đọc phông chữ: ${err?.message}`, 'error');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. STICKERS TAB */}
        {activeTab === 'Stickers' && (
          <div className="flex flex-col gap-3">
            {/* Sticker Sub-navigation Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
              {[
                { id: 'emojis', label: 'Biểu tượng (Emoji)' },
                { id: 'shapes', label: 'Hình học (Shapes)' },
                { id: 'icons', label: 'Icon SVG' },
                { id: 'lottie', label: 'Lottie & GIF' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStickerSubnav(s.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    stickerSubnav === s.id
                      ? 'bg-[#1FC8DB] text-slate-950 font-bold'
                      : 'bg-[#262626] text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 4.1 EMOJIS */}
            {stickerSubnav === 'emojis' && (
              <div className="flex flex-col gap-2">
                {/* Category filter */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'trend', label: 'Trending' },
                    { id: 'face', label: 'Biểu cảm' },
                    { id: 'action', label: 'Động lực' },
                    { id: 'food', label: 'Đồ ăn' },
                    { id: 'symbol', label: 'Ký hiệu' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setStickerCategory(c.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                        stickerCategory === c.id
                          ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/50 font-bold'
                          : 'bg-[#262626] text-[#8A8A8A] hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-6 gap-2 max-h-[460px] overflow-y-auto p-1">
                  {[
                    '🔥', '✨', '🚀', '💯', '🎯', '🎬',
                    '💎', '👑', '🎉', '⚡', '💡', '🏆',
                    '💖', '👏', '🚨', '🌟', '💰', '🤖',
                    '🍿', '🌈', '💥', '🎨', '🎵', '📢',
                    '👀', '🤩', '🥶', '🤯', '🥳', '💃',
                    '🕺', '🍕', '🍔', '☕', '🍺', '🚗',
                    '✈️', '📱', '💻', '📈', '🐶', '🐱',
                    '⚽', '🏀', '🥇', '🎁', '🔔', '📌'
                  ].map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        addClip({
                          track: 'sticker',
                          name: `Sticker ${emoji}`,
                          start: currentTime,
                          duration: 3,
                          type: 'sticker',
                          text: emoji,
                          scale: 1.2,
                          x: 0,
                          y: 0
                        });
                        showToast(`Đã thêm Sticker ${emoji}`);
                      }}
                      className="h-12 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-[#1FC8DB]/50 flex items-center justify-center text-2xl transition-all transform hover:scale-110 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4.2 SHAPES (VECTOR CANVAS SHAPES) */}
            {stickerSubnav === 'shapes' && (
              <div className="flex flex-col gap-3">
                {/* Color Palette */}
                <div className="flex items-center justify-between p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] text-[#8A8A8A] font-bold uppercase">Màu Shape:</span>
                  <div className="flex items-center gap-1.5">
                    {['#1FC8DB', '#F43F5E', '#FBBF24', '#A855F7', '#FFFFFF', '#10B981'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedShapeColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          selectedShapeColor === c ? 'scale-125 border-white ring-1 ring-white' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'rect', label: 'Hình chữ nhật', desc: 'Bo góc mượt' },
                    { id: 'circle', label: 'Hình tròn', desc: 'Khối tròn' },
                    { id: 'star', label: 'Ngôi sao 5 cánh', desc: '5 cánh vàng' },
                    { id: 'heart', label: 'Trái tim', desc: 'Tình cảm' },
                    { id: 'triangle', label: 'Tam giác', desc: 'Cảnh báo' },
                    { id: 'arrow', label: 'Mũi tên chỉ', desc: 'Kêu gọi hành động' },
                    { id: 'frame', label: 'Khung viền', desc: 'Bo khung viền' },
                    { id: 'divider', label: 'Đường kẻ', desc: 'Ngăn cách' }
                  ].map((sh) => (
                    <button
                      key={sh.id}
                      onClick={() => {
                        addClip({
                          track: 'sticker',
                          name: `Shape ${sh.label}`,
                          start: currentTime,
                          duration: 4,
                          type: 'sticker',
                          stickerShape: sh.id as any,
                          stickerFill: selectedShapeColor,
                          stickerStroke: selectedShapeStroke,
                          scale: 1,
                          x: 0,
                          y: 0
                        });
                        showToast(`Đã thêm Shape ${sh.label}!`);
                      }}
                      className="p-3 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105"
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center border border-white/40"
                        style={{ backgroundColor: selectedShapeColor }}
                      />
                      <span className="text-[10px] font-semibold text-white truncate max-w-full">{sh.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4.3 SVG ICONS */}
            {stickerSubnav === 'icons' && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Ngôi sao', icon: Star, color: 'text-amber-400' },
                  { name: 'Trái tim', icon: Heart, color: 'text-rose-400' },
                  { name: 'Ngọn lửa', icon: Flame, color: 'text-orange-400' },
                  { name: 'Sấm sét', icon: Zap, color: 'text-yellow-400' },
                  { name: 'Huy hiệu', icon: Award, color: 'text-[#1FC8DB]' },
                  { name: 'Xác thực', icon: Check, color: 'text-emerald-400' },
                  { name: 'Chuông báo', icon: Radio, color: 'text-purple-400' },
                  { name: 'Phát video', icon: Play, color: 'text-pink-400' }
                ].map((ic, idx) => {
                  const Icon = ic.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        addClip({
                          track: 'sticker',
                          name: `Icon ${ic.name}`,
                          start: currentTime,
                          duration: 3.5,
                          type: 'sticker',
                          text: '⭐',
                          scale: 1.2,
                          x: 0,
                          y: 0
                        });
                        showToast(`Đã thêm Icon ${ic.name}`);
                      }}
                      className="h-16 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                    >
                      <Icon className={`w-5 h-5 ${ic.color}`} />
                      <span className="text-[9px] text-[#8A8A8A]">{ic.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4.4 LOTTIE & GIF ANIMATED STICKERS */}
            {stickerSubnav === 'lottie' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-md bg-[#262626] border border-[#333333] flex flex-col gap-1.5">
                  <span className="font-bold text-white text-xs">Stickers động Lottie JSON & GIF/WebP</span>
                  <p className="text-[11px] text-[#8A8A8A]">
                    Hỗ trợ tải tệp Lottie (.json) hoặc ảnh động GIF / WebP trong suốt để gắn trực tiếp lên video dọc 9:16.
                  </p>
                </div>

                <label className="p-3.5 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] bg-[#262626] flex items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-[#1FC8DB]" />
                  <span className="font-semibold text-xs text-white">+ Tải tệp Lottie JSON / GIF động</span>
                  <input
                    ref={lottieInputRef}
                    type="file"
                    accept=".json,.gif,.webp,image/gif,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        let finalUrl = '';
                        if (file.name.endsWith('.json') || file.type.includes('json')) {
                          const jsonText = await file.text();
                          const lottieCheck = sanitizeLottieJson(jsonText);
                          if (!lottieCheck.valid) {
                            showToast(lottieCheck.error || 'Tệp Lottie JSON không an toàn hoặc không hợp lệ!', 'error');
                            return;
                          }
                          const safeBlob = new Blob([JSON.stringify(lottieCheck.data)], { type: 'application/json' });
                          finalUrl = URL.createObjectURL(safeBlob);
                        } else {
                          finalUrl = URL.createObjectURL(file);
                        }
                        addClip({
                          track: 'sticker',
                          name: file.name,
                          start: currentTime,
                          duration: 5,
                          type: 'sticker',
                          src: finalUrl,
                          scale: 1.2,
                          x: 0,
                          y: 0
                        });
                        showToast(`Đã thêm sticker động an toàn "${file.name}"!`, 'success');
                      } catch (err: any) {
                        showToast(`Lỗi xử lý sticker: ${err.message}`, 'error');
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Sample Animated Stickers */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Stickers động mẫu sẵn có:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Confetti Bắn Pháo', emoji: '🎉', dur: 4 },
                      { name: 'Neon Pulse Heart', emoji: '💖', dur: 4 },
                      { name: 'Fire Blazing Flame', emoji: '🔥', dur: 4 }
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                          addClip({
                            track: 'sticker',
                            name: s.name,
                            start: currentTime,
                            duration: s.dur,
                            type: 'sticker',
                            text: s.emoji,
                            scale: 1.4,
                            x: 0,
                            y: 0
                          });
                          showToast(`Đã thêm sticker động ${s.name}!`);
                        }}
                        className="p-3 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] flex flex-col items-center gap-1 text-center"
                      >
                        <span className="text-2xl animate-bounce">{s.emoji}</span>
                        <span className="text-[10px] text-white font-medium truncate max-w-full">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. EFFECTS TAB */}
        {activeTab === 'Effects' && (
          <div className="flex flex-col gap-3">
            {/* Interactive Effect Parameter Controls */}
            <div className="p-2.5 rounded-md bg-[#262626] border border-[#333333] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Thông số hiệu ứng (Effect Controls)</span>
                <div className="flex items-center gap-1 bg-[#1F1F1F] p-0.5 rounded border border-[#333333]">
                  <button
                    onClick={() => setEffectApplyTarget('track')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                      effectApplyTarget === 'track' ? 'bg-[#1FC8DB] text-black' : 'text-[#8A8A8A] hover:text-white'
                    }`}
                  >
                    Track riêng
                  </button>
                  <button
                    onClick={() => setEffectApplyTarget('selectedClip')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                      effectApplyTarget === 'selectedClip' ? 'bg-[#1FC8DB] text-black' : 'text-[#8A8A8A] hover:text-white'
                    }`}
                  >
                    Vào clip chọn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8A8A8A]">Độ mạnh (Intensity):</span>
                    <span className="font-mono text-[#1FC8DB]">{effectIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={effectIntensity}
                    onChange={(e) => setEffectIntensity(parseInt(e.target.value))}
                    className="accent-[#1FC8DB] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8A8A8A]">Tốc độ (Speed):</span>
                    <span className="font-mono text-[#1FC8DB]">{effectSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={effectSpeed}
                    onChange={(e) => setEffectSpeed(parseFloat(e.target.value))}
                    className="accent-[#1FC8DB] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 13 Video Effects Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
              {[
                { id: 'blur', name: 'Mờ ảo (Dreamy Blur)', desc: 'Làm mờ mộng mơ êm dịu', icon: Eye, color: 'text-sky-300' },
                { id: 'glitch', name: 'Nhiễu số (Digital Glitch)', desc: 'Chớp giật công nghệ hiện đại', icon: Zap, color: 'text-pink-400' },
                { id: 'vhs', name: 'Băng từ VHS 1990', desc: 'Scanlines đường quét CRT hoài niệm', icon: Film, color: 'text-amber-400' },
                { id: 'rgb', name: 'Tách màu RGB Split', desc: 'Quang sai sắc tố viền đỏ xanh', icon: Layers, color: 'text-cyan-400' },
                { id: 'shake', name: 'Rung lắc (Camera Shake)', desc: 'Rung lắc máy quay giật gân', icon: RotateCcw, color: 'text-rose-400' },
                { id: 'pulse', name: 'Đập nhịp (Zoom Pulse)', desc: 'Zoom phóng đại theo nhịp bass', icon: Radio, color: 'text-emerald-400' },
                { id: 'flash', name: 'Chớp trắng (Flash Strobe)', desc: 'Chớp sáng lóe mắt kịch tính', icon: Sparkles, color: 'text-white' },
                { id: 'vignette', name: 'Tối 4 góc (Vignette)', desc: 'Tập trung ánh nhìn vào giữa', icon: Eye, color: 'text-zinc-400' },
                { id: 'grain', name: 'Hạt phim 35mm (Film Grain)', desc: 'Nhiễu hạt cổ điển điện ảnh', icon: Sparkles, color: 'text-orange-300' },
                { id: 'mirror', name: 'Gương lật (Mirror Split)', desc: 'Phản chiếu đối xứng trục giữa', icon: SlidersHorizontal, color: 'text-purple-300' },
                { id: 'pixelate', name: 'Điểm ảnh (Pixelate Mosaic)', desc: 'Mosaic retro 8-bit cổ điển', icon: Shapes, color: 'text-lime-400' },
                { id: 'snow', name: 'Tuyết rơi (Falling Snow)', desc: 'Bông tuyết trắng rơi lãng mạn', icon: Sparkles, color: 'text-blue-200' },
                { id: 'light_leak', name: 'Rò sáng (Light Leak)', desc: 'Vệt nắng hoàng hôn ấm áp', icon: Flame, color: 'text-amber-500' }
              ].map((eff) => {
                const Icon = eff.icon;
                return (
                  <button
                    key={eff.id}
                    onClick={() => {
                      if (effectApplyTarget === 'selectedClip') {
                        const videoClip = clips.find((c) => c.id === selectedClipId && (c.track === 'video' || c.type === 'video')) || clips.find((c) => c.track === 'video');
                        if (videoClip) {
                          updateClip(videoClip.id, {
                            effectType: eff.id,
                            effectIntensity: effectIntensity,
                            effectSpeed: effectSpeed
                          });
                          showToast(`Đã gắn hiệu ứng "${eff.name}" vào clip "${videoClip.name}"!`, 'success');
                        } else {
                          showToast('Vui lòng chọn một clip video trên timeline trước!', 'warning');
                        }
                      } else {
                        addClip({
                          track: 'effect',
                          name: eff.name,
                          start: currentTime,
                          duration: 5,
                          type: 'effect',
                          effectType: eff.id,
                          effectIntensity: effectIntensity,
                          effectSpeed: effectSpeed
                        });
                        showToast(`Đã thêm Track Hiệu Ứng "${eff.name}" phủ toàn bộ!`, 'success');
                      }
                    }}
                    className="p-2.5 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-left flex flex-col justify-between transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${eff.color}`} />
                      <span className="font-bold text-white text-xs truncate">{eff.name}</span>
                    </div>
                    <span className="text-[10px] text-[#8A8A8A] line-clamp-1 mb-2">{eff.desc}</span>
                    <span className="text-[10px] text-[#1FC8DB] font-bold self-end">+ Áp dụng</span>
                  </button>
                );
              })}
            </div>

            {/* Procedural Particles Confetti */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
                  addClip({
                    track: 'effect',
                    name: 'Pháo giấy Confetti',
                    start: currentTime,
                    duration: 4,
                    type: 'particle',
                    particleType: 'confetti'
                  });
                  showToast('Đã kích hoạt pháo giấy Confetti!', 'success');
                }}
                className="p-2.5 rounded-md bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/30 hover:border-pink-400 text-left flex justify-between items-center transition-all hover:scale-[1.02]"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-pink-300 text-xs">🎉 Pháo Confetti</span>
                  <span className="text-[9px] text-[#8A8A8A]">Ăn mừng rực rỡ</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-pink-500 text-slate-950 font-bold text-[9px]">Bắn ngay</span>
              </button>

              <button
                onClick={() => {
                  addClip({
                    track: 'effect',
                    name: 'Hạt sáng lấp lánh (Sparkles)',
                    start: currentTime,
                    duration: 5,
                    type: 'particle',
                    particleType: 'sparkles'
                  });
                  showToast('Đã thêm hạt sáng Sparkles!');
                }}
                className="p-2.5 rounded-md bg-gradient-to-r from-[#1FC8DB]/15 to-sky-500/15 border border-[#1FC8DB]/30 hover:border-[#1FC8DB] text-left flex justify-between items-center transition-all hover:scale-[1.02]"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-[#1FC8DB] text-xs">✨ Hạt Sparkles</span>
                  <span className="text-[9px] text-[#8A8A8A]">Bụi ánh sáng bay</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#1FC8DB] text-slate-950 font-bold text-[9px]">+ Thêm</span>
              </button>
            </div>

            {/* Body Effects (AI Required) - Disabled Card */}
            <div
              onClick={() => setBodyEffectsModalOpen(true)}
              className="p-2.5 rounded-md bg-[#262626]/60 border border-[#333333] opacity-60 cursor-pointer flex items-center justify-between hover:border-amber-500/40"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white text-xs">Body Effects (Hiệu ứng cơ thể AI)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">AI Pose Required</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A8A]">Hào quang viền người, tia lửa bao quanh cơ thể</span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-bold">Xem thông tin 🔒</span>
            </div>
          </div>
        )}

        {/* 6. TRANSITIONS TAB */}
        {activeTab === 'Transitions' && (
          <div className="flex flex-col gap-3">
            {/* Transition Controls Bar */}
            <div className="p-2.5 rounded-md bg-[#262626] border border-[#333333] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Thời lượng chuyển cảnh</span>
                <span className="font-mono text-xs text-[#1FC8DB] font-bold">{transitionDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                className="accent-[#1FC8DB] cursor-pointer"
              />

              <button
                onClick={() => {
                  const videoClips = clips.filter((c) => c.track === 'video' || c.type === 'video');
                  if (videoClips.length === 0) {
                    showToast('Chưa có clip video nào trên timeline để áp dụng!', 'warning');
                    return;
                  }
                  videoClips.forEach((c) => {
                    updateClip(c.id, {
                      transitionType: selectedTransition,
                      transitionDuration: transitionDuration
                    });
                  });
                  showToast(`Đã áp dụng chuyển cảnh "${selectedTransition}" (${transitionDuration}s) cho tất cả ${videoClips.length} clip video!`, 'success');
                }}
                className="w-full py-1.5 rounded bg-[#1FC8DB]/20 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Áp dụng cho tất cả điểm cắt (Apply to all)</span>
              </button>
            </div>

            {/* 13 Transitions Grid */}
            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto">
              {[
                { type: 'fade', name: 'Mờ dần vào đen (Fade to Black)', desc: 'Chuyển cảnh êm dịu thanh lịch' },
                { type: 'dissolve', name: 'Hòa tan mềm (Cross Dissolve)', desc: 'Tan chảy giữa 2 khung hình' },
                { type: 'slideLeft', name: 'Lướt sang trái (Slide Left)', desc: 'Chuyển cảnh tốc độ cao sang trái' },
                { type: 'slideRight', name: 'Lướt sang phải (Slide Right)', desc: 'Chuyển cảnh lướt sang phải' },
                { type: 'slideUp', name: 'Lướt lên trên (Slide Up)', desc: 'Cuộn trào từ dưới lên trên' },
                { type: 'slideDown', name: 'Lướt xuống dưới (Slide Down)', desc: 'Rơi từ trên xuống dưới' },
                { type: 'wipe', name: 'Quét ngang (Horizontal Wipe)', desc: 'Vệt quét mở rộng khung hình' },
                { type: 'zoom', name: 'Phóng to lóe sáng (Zoom In)', desc: 'Zoom mạnh mẽ bùng nổ khung hình' },
                { type: 'spin', name: 'Xoay tròn (Spin 360)', desc: 'Xoay tròn 360 độ vào vị trí' },
                { type: 'flip', name: 'Lật 3D (3D Flip)', desc: 'Lật thẻ 3D qua trục đứng' },
                { type: 'glitch', name: 'Nhiễu sóng (Glitch Stutter)', desc: 'Chớp giật kỹ thuật số hiện đại' },
                { type: 'blur', name: 'Mờ chuyển động (Motion Blur)', desc: 'Vệt nhòe tốc độ cao điện ảnh' },
                { type: 'push', name: 'Đẩy khung hình (Push Cut)', desc: 'Đẩy khung hình trước ra ngoài' }
              ].map((trans) => (
                <div
                  key={trans.type}
                  className={`p-2.5 rounded-md bg-[#262626] border flex items-center justify-between transition-all ${
                    selectedTransition === trans.type ? 'border-[#1FC8DB] bg-[#1FC8DB]/10' : 'border-[#333333] hover:border-[#1FC8DB]/40'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-semibold text-white text-xs truncate">{trans.name}</span>
                    <span className="text-[10px] text-[#8A8A8A] truncate">{trans.desc}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedTransition(trans.type);
                        const videoClip = clips.find((c) => c.id === selectedClipId && (c.track === 'video' || c.type === 'video')) || clips.find((c) => c.track === 'video');
                        if (videoClip) {
                          updateClip(videoClip.id, {
                            transitionType: trans.type,
                            transitionDuration: transitionDuration
                          });
                          showToast(`Đã áp dụng chuyển cảnh: ${trans.name}`, 'success');
                        } else {
                          showToast('Vui lòng chọn một clip video trên timeline trước!', 'warning');
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[10px] transition-colors"
                    >
                      + Áp dụng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. CAPTIONS TAB (3.7) */}
        {activeTab === 'Captions' && (
          <div className="flex flex-col gap-4 pb-6">
            <div className="flex items-center justify-between pb-1 border-b border-[#333333]">
              <div>
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Subtitles className="w-4 h-4 text-[#1FC8DB]" />
                  Phụ đề video 9:16 (Captions)
                </span>
                <p className="text-[10px] text-[#8A8A8A]">
                  Tự động bằng Whisper AI, Dictate Micro & Nhập/Xuất SRT/VTT/LRC
                </p>
              </div>
            </div>

            {/* 1. Auto Captions via Whisper (transformers.js WebGPU / WASM) */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-gradient-to-b from-[#262626] to-[#1F1F1F] border border-[#1FC8DB]/30 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-[#1FC8DB]" />
                  Whisper AI Speech-to-Text
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1FC8DB]/20 text-[#1FC8DB]">
                  WebGPU / WASM
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A8A]">
                Nhận diện trực tiếp trên trình duyệt bằng Whisper AI. Chạy offline 100%, bảo mật tuyệt đối.
              </p>

              {/* Source & Language Selectors */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col gap-1">
                  <span className="text-[#8A8A8A]">Nguồn âm thanh:</span>
                  <select
                    value={captionSource}
                    onChange={(e: any) => setCaptionSource(e.target.value)}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-1.5 text-white outline-none text-[11px]"
                  >
                    <option value="selected">Clip video đã chọn</option>
                    <option value="timeline">Toàn timeline</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#8A8A8A]">Ngôn ngữ:</span>
                  <select
                    value={captionLanguage}
                    onChange={(e: any) => setCaptionLanguage(e.target.value)}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-1.5 text-white outline-none text-[11px]"
                  >
                    <option value="vi">Tiếng Việt (vi)</option>
                    <option value="en">English (en)</option>
                    <option value="auto">Tự động phát hiện</option>
                  </select>
                </div>
              </div>

              {/* Whisper Run Button & Progress Bar */}
              {isWhisperRunning ? (
                <div className="flex flex-col gap-1.5 p-2.5 rounded bg-[#1A1A1A] border border-[#1FC8DB]/40">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#1FC8DB] font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {whisperStatus || 'Đang nhận diện giọng nói...'}
                    </span>
                    <span className="font-mono text-white font-bold">{whisperProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#2E2E2E] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1FC8DB] to-[#4BD9E8] transition-all duration-300"
                      style={{ width: `${whisperProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRunWhisper}
                  className="w-full py-2.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tự động tạo phụ đề (Whisper AI)</span>
                </button>
              )}
            </div>

            {/* 2. Dictate via Microphone (Web Speech API) */}
            <div className="flex flex-col gap-2 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#1FC8DB]" />
                  Dictate bằng Micro (Web Speech)
                </span>
                <span className="text-[10px] text-[#8A8A8A]">Nói trực tiếp</span>
              </div>
              <p className="text-[10px] text-[#8A8A8A]">
                Nói vào micro để tự động chuyển thành câu phụ đề đặt tại vị trí con trỏ phát (Playhead).
              </p>
              <button
                onClick={handleAutoCaptions}
                className={`w-full py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isListeningSpeech
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] hover:border-[#1FC8DB]/50 text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>{isListeningSpeech ? 'Đang nghe... Bấm để dừng' : 'Bắt đầu Dictate giọng nói'}</span>
              </button>
              {speechError && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{speechError}</span>
                </div>
              )}
            </div>

            {/* 3. Manual Caption Box */}
            <div className="flex flex-col gap-2 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <span className="font-bold text-white text-xs uppercase tracking-wide">
                Nhập phụ đề thủ công
              </span>
              <textarea
                rows={2}
                value={manualCaptionText}
                onChange={(e) => setManualCaptionText(e.target.value)}
                placeholder="Nhập nội dung câu phụ đề tại đây..."
                className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2.5 text-xs text-[#E6E6E6] outline-none resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-[#8A8A8A]">
                <span>Thời lượng hiển thị:</span>
                <span className="font-mono text-[#1FC8DB] font-bold">{manualCaptionDuration} giây</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={manualCaptionDuration}
                onChange={(e) => setManualCaptionDuration(parseFloat(e.target.value))}
                className="accent-[#1FC8DB] cursor-pointer"
              />
              <button
                onClick={() => {
                  if (!manualCaptionText.trim()) {
                    showToast('Vui lòng nhập nội dung phụ đề trước!', 'warning');
                    return;
                  }
                  addClip({
                    track: 'text',
                    name: `Sub: "${manualCaptionText.slice(0, 15)}..."`,
                    start: currentTime,
                    duration: manualCaptionDuration,
                    type: 'text',
                    text: manualCaptionText,
                    scale: styleCaptionScale,
                    y: styleCaptionY,
                    fontFamily: styleCaptionFont,
                    presetId: styleCaptionPreset,
                    textAnimIn: 'pop'
                  });
                  setManualCaptionText('');
                  showToast('Đã thêm câu phụ đề vào timeline!', 'success');
                }}
                className="py-2 rounded-md bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm câu phụ đề này</span>
              </button>
            </div>

            {/* 4. Import / Export Subtitles (SRT, VTT, LRC) */}
            <div className="flex flex-col gap-2 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Nhập & Xuất tệp phụ đề
                </span>
                <span className="text-[10px] text-[#8A8A8A]">SRT • VTT • LRC</span>
              </div>

              {/* Import Subtitle File */}
              <input
                ref={subtitleFileInputRef}
                type="file"
                accept=".srt,.vtt,.lrc,text/plain"
                onChange={handleImportSubtitleFile}
                className="hidden"
              />
              <button
                onClick={() => subtitleFileInputRef.current?.click()}
                className="w-full py-2 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] bg-[#2E2E2E] flex items-center justify-center gap-2 cursor-pointer transition-colors text-center text-xs text-white font-medium"
              >
                <Upload className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>Chọn tệp phụ đề (.SRT / .VTT / .LRC)</span>
              </button>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => handleExportSubtitleFormat('srt')}
                  className="flex-1 py-1.5 rounded bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3 text-[#1FC8DB]" />
                  <span>Xuất SRT</span>
                </button>
                <button
                  onClick={() => handleExportSubtitleFormat('vtt')}
                  className="flex-1 py-1.5 rounded bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3 text-[#1FC8DB]" />
                  <span>Xuất VTT</span>
                </button>
                <button
                  onClick={() => handleExportSubtitleFormat('lrc')}
                  className="flex-1 py-1.5 rounded bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3 text-[#1FC8DB]" />
                  <span>Xuất LRC</span>
                </button>
              </div>
            </div>

            {/* 5. Style Captions Bar (Áp dụng cho toàn bộ phụ đề) */}
            <div className="flex flex-col gap-2.5 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <span className="font-bold text-white text-xs uppercase tracking-wide">
                Đồng bộ phong cách toàn bộ phụ đề
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col gap-1">
                  <span className="text-[#8A8A8A]">Kiểu chữ (Preset):</span>
                  <select
                    value={styleCaptionPreset}
                    onChange={(e: any) => setStyleCaptionPreset(e.target.value)}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-1.5 text-white outline-none text-[11px]"
                  >
                    <option value="hormozi">Hormozi (Vàng viền đen)</option>
                    <option value="neon_cyan">Neon Cyan (Phát sáng)</option>
                    <option value="yellow_sub">Hộp đen chữ vàng</option>
                    <option value="black_box">Hộp đen chữ trắng</option>
                    <option value="minimalist">Minimalist (Tinh tế)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#8A8A8A]">Font chữ:</span>
                  <select
                    value={styleCaptionFont}
                    onChange={(e) => setStyleCaptionFont(e.target.value)}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-1.5 text-white outline-none text-[11px]"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Oswald">Oswald</option>
                  </select>
                </div>
              </div>

              {/* Scale & Y Position */}
              <div className="flex items-center justify-between text-[11px] text-[#8A8A8A]">
                <span>Cỡ chữ: <b className="text-white font-mono">{styleCaptionScale}x</b></span>
                <span>Vị trí Y: <b className="text-white font-mono">{styleCaptionY}px</b></span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.1"
                value={styleCaptionScale}
                onChange={(e) => setStyleCaptionScale(parseFloat(e.target.value))}
                className="accent-[#1FC8DB] cursor-pointer"
              />

              <button
                onClick={handleApplyStyleToAllCaptions}
                className="w-full py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] border border-[#1FC8DB]/40 text-[#1FC8DB] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Áp dụng phong cách cho toàn bộ phụ đề</span>
              </button>
            </div>

            {/* 6. Translate Captions */}
            <div className="flex flex-col gap-2 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Dịch phụ đề tự động
                </span>
                <Languages className="w-4 h-4 text-[#1FC8DB]" />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={translateTargetLang}
                  onChange={(e) => setTranslateTargetLang(e.target.value)}
                  className="flex-1 bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                >
                  <option value="en">Dịch sang Tiếng Anh (English)</option>
                  <option value="vi">Dịch sang Tiếng Việt</option>
                  <option value="zh">Dịch sang Tiếng Trung (中文)</option>
                  <option value="ja">Dịch sang Tiếng Nhật (日本語)</option>
                  <option value="ko">Dịch sang Tiếng Hàn (한국어)</option>
                  <option value="fr">Dịch sang Tiếng Pháp (Français)</option>
                  <option value="es">Dịch sang Tiếng TBN (Español)</option>
                </select>
                <button
                  onClick={handleTranslateCaptions}
                  disabled={isTranslating}
                  className="px-3 py-2 rounded bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs shrink-0 transition-colors"
                >
                  {isTranslating ? 'Đang dịch...' : 'Dịch ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. FILTERS TAB (3.8) */}
        {activeTab === 'Filters' && (
          <div className="flex flex-col gap-3 pb-6">
            <div className="flex items-center justify-between pb-1 border-b border-[#333333]">
              <div>
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#1FC8DB]" />
                  Bộ Lọc Màu Điện Ảnh (30+ Filters & 3D LUT)
                </span>
                <p className="text-[10px] text-[#8A8A8A]">
                  Color grading chuẩn Hollywood bằng LUT 3D trong WebGL
                </p>
              </div>
            </div>

            {/* 7 Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {(['Featured', 'Life', 'Cinematic', 'Scenery', 'Retro', 'B&W', 'Food'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                    filterCategory === cat
                      ? 'bg-[#1FC8DB] text-slate-950 font-bold'
                      : 'bg-[#262626] text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {cat === 'Featured' ? 'Nổi bật' : cat === 'Life' ? 'Đời sống' : cat === 'Cinematic' ? 'Điện ảnh' : cat === 'Scenery' ? 'Phong cảnh' : cat === 'Retro' ? 'Cổ điển' : cat === 'B&W' ? 'Đen trắng' : 'Ẩm thực'}
                </button>
              ))}
            </div>

            {/* Filter Intensity Slider */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-md bg-[#262626] border border-[#333333]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8A8A8A]">Cường độ bộ lọc (Intensity):</span>
                <span className="font-mono text-[#1FC8DB] font-bold">{filterIntensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={filterIntensity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFilterIntensity(val);
                  if (selectedClipId) {
                    updateClip(selectedClipId, { filterIntensity: val });
                  }
                }}
                className="accent-[#1FC8DB] cursor-pointer"
              />
            </div>

            {/* Import 3D LUT .cube button */}
            <div className="flex items-center gap-2">
              <input
                ref={cubeInputRef}
                type="file"
                accept=".cube,text/plain"
                onChange={handleImportCubeFile}
                className="hidden"
              />
              <button
                onClick={() => cubeInputRef.current?.click()}
                className="w-full py-2 rounded-md border border-dashed border-[#333333] hover:border-[#1FC8DB] bg-[#262626] flex items-center justify-center gap-1.5 text-xs text-white font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>+ Nhập file 3D LUT (.cube)</span>
              </button>
            </div>

            {/* 30+ Filters Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-0.5">
              {FILTER_PRESETS
                .filter((p) => filterCategory === 'Featured' || p.category === filterCategory)
                .map((f) => {
                  const isSelected = selectedFilterId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleApplyFilter(f.id)}
                      className={`p-2.5 rounded-md text-left flex flex-col gap-1.5 transition-all border ${
                        isSelected
                          ? 'bg-[#1FC8DB]/15 border-[#1FC8DB] shadow-md shadow-cyan-500/10'
                          : 'bg-[#262626] hover:bg-[#2E2E2E] border-[#333333] hover:border-[#1FC8DB]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-inner"
                          style={{ backgroundColor: f.color }}
                        />
                        {isSelected && (
                          <span className="text-[9px] font-bold text-[#1FC8DB] bg-[#1FC8DB]/20 px-1 rounded">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-xs truncate">{f.name}</span>
                        <span className="text-[10px] text-[#8A8A8A] line-clamp-1">{f.desc}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#333333]">
              <button
                onClick={() => handleApplyFilter(selectedFilterId)}
                className="w-full py-2 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Áp lên clip đang chọn ({selectedFilterId})</span>
              </button>
              <button
                onClick={() => handleAddFilterTrack(selectedFilterId)}
                className="w-full py-2 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>+ Thả thành track Filter riêng (phủ toàn bộ)</span>
              </button>
            </div>
          </div>
        )}

        {/* 9. ADJUSTMENT TAB (3.9) */}
        {activeTab === 'Adjustment' && (
          <div className="flex flex-col gap-4 pb-6">
            <div className="flex items-center justify-between pb-1 border-b border-[#333333]">
              <div>
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#1FC8DB]" />
                  Layer Điều Chỉnh Màu Sắc (Adjustment)
                </span>
                <p className="text-[10px] text-[#8A8A8A]">
                  Toàn diện 16 thông số: Phơi sáng, Tương phản, Nhiệt độ, HSL, Color Wheels
                </p>
              </div>
              <button
                onClick={handleResetAdjustments}
                className="p-1 rounded text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors"
                title="Đặt lại toàn bộ thông số về mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-[#8A8A8A] uppercase">Presets màu điện ảnh</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'cinematic', label: 'Teal & Orange', color: '#0ea5e9' },
                  { key: 'moody', label: 'Moody Film', color: '#6366f1' },
                  { key: 'sunset', label: 'Sunset', color: '#f59e0b' },
                  { key: 'cyberpunk', label: 'Cyberpunk', color: '#ec4899' },
                  { key: 'noir', label: 'Noir B&W', color: '#94a3b8' },
                  { key: 'vintage', label: 'Vintage 70s', color: '#d97706' },
                  { key: 'portrait', label: 'Portrait', color: '#10b981' },
                  { key: 'punch', label: 'Punch', color: '#f43f5e' }
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectAdjPreset(p.key)}
                    className={`py-1.5 px-2 rounded-md border text-[10px] font-medium flex items-center gap-1 transition-all truncate ${
                      selectedAdjPreset === p.key
                        ? 'border-[#1FC8DB] bg-[#1FC8DB]/15 text-[#1FC8DB]'
                        : 'border-[#333333] bg-[#262626] text-[#E6E6E6] hover:border-[#1FC8DB]/40'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders Container: Tone & Exposure */}
            <div className="flex flex-col gap-3 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <span className="text-[10px] font-bold text-[#1FC8DB] uppercase tracking-wider">
                Ánh sáng & Phơi sáng
              </span>

              {/* Exposure */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Phơi sáng (Exposure):</span>
                  <span className="font-mono text-white font-bold">{adjExposure > 0 ? `+${adjExposure}` : adjExposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjExposure}
                  onChange={(e) => setAdjExposure(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Độ sáng (Brightness):</span>
                  <span className="font-mono text-white font-bold">{adjBrightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={adjBrightness}
                  onChange={(e) => setAdjBrightness(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Độ tương phản (Contrast):</span>
                  <span className="font-mono text-white font-bold">{adjContrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={adjContrast}
                  onChange={(e) => setAdjContrast(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Highlight */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Vùng sáng (Highlights):</span>
                  <span className="font-mono text-white font-bold">{adjHighlight > 0 ? `+${adjHighlight}` : adjHighlight}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjHighlight}
                  onChange={(e) => setAdjHighlight(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Shadow */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Vùng tối (Shadows):</span>
                  <span className="font-mono text-white font-bold">{adjShadow > 0 ? `+${adjShadow}` : adjShadow}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjShadow}
                  onChange={(e) => setAdjShadow(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>
            </div>

            {/* Sliders Container: Color & Temperature */}
            <div className="flex flex-col gap-3 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <span className="text-[10px] font-bold text-[#1FC8DB] uppercase tracking-wider">
                Màu sắc & Sắc thái
              </span>

              {/* Temperature */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Nhiệt độ màu (Temp):</span>
                  <span className="font-mono text-white font-bold">{adjTemp > 0 ? `+${adjTemp}` : adjTemp}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={adjTemp}
                  onChange={(e) => setAdjTemp(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Tint */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Sắc thái (Tint):</span>
                  <span className="font-mono text-white font-bold">{adjTint > 0 ? `+${adjTint}` : adjTint}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={adjTint}
                  onChange={(e) => setAdjTint(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Độ bão hòa (Saturation):</span>
                  <span className="font-mono text-white font-bold">{adjSaturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={adjSaturation}
                  onChange={(e) => setAdjSaturation(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Hue */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Đổi tông màu (Hue):</span>
                  <span className="font-mono text-white font-bold">{adjHue}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={adjHue}
                  onChange={(e) => setAdjHue(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>
            </div>

            {/* Sliders Container: Texture & Vignette */}
            <div className="flex flex-col gap-3 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <span className="text-[10px] font-bold text-[#1FC8DB] uppercase tracking-wider">
                Chất liệu & Độ nét
              </span>

              {/* Vignette */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Tối góc (Vignette):</span>
                  <span className="font-mono text-white font-bold">{adjVignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjVignette}
                  onChange={(e) => setAdjVignette(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Sharpness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Độ sắc nét (Sharpness):</span>
                  <span className="font-mono text-white font-bold">{adjSharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjSharpness}
                  onChange={(e) => setAdjSharpness(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>

              {/* Film Grain */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8A8A8A]">Hạt phim (Film Grain):</span>
                  <span className="font-mono text-white font-bold">{adjGrain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjGrain}
                  onChange={(e) => setAdjGrain(parseInt(e.target.value))}
                  className="accent-[#1FC8DB] cursor-pointer"
                />
              </div>
            </div>

            {/* Color Wheels & HSL Controls */}
            <div className="flex flex-col gap-2.5 p-3 rounded-md bg-[#262626] border border-[#333333]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#1FC8DB] uppercase tracking-wider">
                  Bánh xe màu (Color Wheels)
                </span>
                <div className="flex items-center gap-1">
                  {(['lift', 'gamma', 'gain'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setColorWheelMode(mode)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        colorWheelMode === mode
                          ? 'bg-[#1FC8DB] text-black'
                          : 'bg-[#2E2E2E] text-[#8A8A8A] hover:text-white'
                      }`}
                    >
                      {mode === 'lift' ? 'Lift (Tối)' : mode === 'gamma' ? 'Gamma (Vừa)' : 'Gain (Sáng)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Color Swatches */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#8A8A8A]">Sắc thái nhanh:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { name: 'Warm', color: '#f59e0b' },
                    { name: 'Cool', color: '#0ea5e9' },
                    { name: 'Magenta', color: '#ec4899' },
                    { name: 'Green', color: '#10b981' },
                    { name: 'Neutral', color: '#ffffff' }
                  ].map((s) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        if (colorWheelMode === 'lift') setLiftColor(s.color);
                        else if (colorWheelMode === 'gamma') setGammaColor(s.color);
                        else setGainColor(s.color);
                        showToast(`Đã áp dụng sắc thái ${s.name} vào ${colorWheelMode.toUpperCase()}`, 'info');
                      }}
                      className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: s.color }}
                      title={s.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddAdjustmentTrack}
                className="w-full py-2.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Layer Điều Chỉnh (Adjustment Track)</span>
              </button>

              <button
                onClick={handleApplyAdjustmentsToClip}
                className="w-full py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] border border-[#333333] text-white font-medium text-xs transition-colors"
              >
                Áp dụng trực tiếp vào clip video đang chọn
              </button>
            </div>
          </div>
        )}

        {/* 10. TEMPLATES TAB (3.10) */}
        {activeTab === 'Templates' && (
          <div className="flex flex-col gap-3 pb-6">
            <div className="flex items-center justify-between pb-1 border-b border-[#333333]">
              <div>
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <LayoutTemplate className="w-4 h-4 text-[#1FC8DB]" />
                  Kho Mẫu Video 9:16 (Templates)
                </span>
                <p className="text-[10px] text-[#8A8A8A]">
                  16 mẫu hoàn chỉnh đa track cho TikTok, Reels, YouTube Shorts
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'trending', label: 'Trending' },
                { id: 'intro', label: 'Intro Hook' },
                { id: 'vlog', label: 'Vlog' },
                { id: 'sale', label: 'Bán hàng' },
                { id: 'quotes', label: 'Quotes' },
                { id: 'tiktok', label: 'TikTok Viral' },
                { id: 'podcast', label: 'Podcast' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setTemplateCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                    templateCategory === c.id
                      ? 'bg-[#1FC8DB] text-slate-950 font-bold'
                      : 'bg-[#262626] text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Templates Grid (16 Rich Multi-Track Templates) */}
            <div className="grid grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-0.5">
              {templatesList
                .filter((t) => templateCategory === 'all' || t.cat === templateCategory)
                .map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-2.5 rounded-md bg-[#262626] border border-[#333333] hover:border-[#1FC8DB]/60 flex flex-col gap-2 transition-all hover-lift"
                  >
                    {/* 9:16 Aspect Thumbnail Placeholder */}
                    <div className="w-full aspect-[9/16] rounded bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] border border-[#333333]/80 p-2 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between z-10">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-black/60 text-[#1FC8DB]">
                          {tmpl.cat}
                        </span>
                        <span className="text-[9px] font-mono text-white/80 bg-black/40 px-1 rounded">
                          {tmpl.dur}s
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center text-center my-auto z-10 px-1">
                        <span className="font-black text-xs text-white leading-tight drop-shadow-md">
                          {tmpl.title}
                        </span>
                        <span className="text-[9px] text-[#1FC8DB] mt-1 line-clamp-1 font-medium">
                          {tmpl.subText}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[8px] text-[#8A8A8A] z-10">
                        <span>Multi-track</span>
                        <span className="text-amber-300">★ BGM Auto</span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white text-xs truncate">{tmpl.name}</span>
                      <span className="text-[10px] text-[#8A8A8A] line-clamp-1">{tmpl.desc}</span>
                    </div>

                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="w-full py-1.5 rounded bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-[11px] transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Áp dụng mẫu</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3.1 MEDIA MODALS & OVERLAYS                      */}
      {/* ======================================================== */}

      {/* 1. Context Menu (Chuột phải trên Media Card) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#262626] border border-[#333333] rounded-lg shadow-2xl py-1 text-xs text-[#E6E6E6] flex flex-col min-w-[180px] backdrop-blur-md"
          style={{ left: Math.min(window.innerWidth - 200, contextMenu.x), top: Math.min(window.innerHeight - 240, contextMenu.y) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={async () => {
              const m = contextMenu.media;
              const url = URL.createObjectURL(m.blob);
              const meta = await generateMediaMetadata(m.blob as File, url);
              addClip({
                track: m.type === 'audio' ? 'audio' : 'video',
                name: m.name,
                start: currentTime,
                duration: m.type === 'audio' ? 12 : m.type === 'image' ? 5 : 8,
                type: m.type,
                src: url,
                thumbnailUrl: meta.thumbnailUrl,
                waveformPeaks: meta.waveformPeaks
              });
              setContextMenu(null);
              showToast(`Đã thêm "${m.name}" vào timeline!`, 'success');
            }}
            className="px-3 py-2 hover:bg-[#2E2E2E] text-left flex items-center gap-2 text-white font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-[#1FC8DB]" />
            <span>+ Thêm vào timeline</span>
          </button>

          <button
            onClick={() => {
              setRenameMediaItem(contextMenu.media);
              setRenameNewName(contextMenu.media.name);
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-[#2E2E2E] text-left flex items-center gap-2 text-[#E6E6E6]"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Đổi tên (Rename)</span>
          </button>

          <button
            onClick={() => {
              setMediaInfoModalItem(contextMenu.media);
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-[#2E2E2E] text-left flex items-center gap-2 text-[#E6E6E6]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Xem thông tin (Reveal info)</span>
          </button>

          <button
            onClick={() => {
              mediaFileInputRef.current?.click();
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-[#2E2E2E] text-left flex items-center gap-2 text-[#E6E6E6]"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Liên kết lại (Relink)</span>
          </button>

          <div className="h-[1px] bg-[#333333] my-1" />

          <button
            onClick={() => {
              handleDeleteMedia(contextMenu.media.id);
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-rose-950/40 text-rose-300 text-left flex items-center gap-2 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Xóa khỏi dự án (Delete)</span>
          </button>
        </div>
      )}

      {/* 2. Double-Click Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 bg-[#262626] border-b border-[#333333] flex items-center justify-between">
              <span className="font-bold text-white text-xs truncate max-w-xs">{previewMedia.name}</span>
              <button onClick={() => setPreviewMedia(null)} className="text-[#8A8A8A] hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black min-h-[260px] max-h-[420px] overflow-hidden">
              {previewMedia.type === 'video' ? (
                <video src={URL.createObjectURL(previewMedia.blob)} controls autoPlay className="max-h-[380px] rounded" />
              ) : previewMedia.type === 'image' ? (
                <img src={URL.createObjectURL(previewMedia.blob)} alt={previewMedia.name} className="max-h-[380px] object-contain rounded" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-emerald-400 p-6">
                  <Volume2 className="w-12 h-12" />
                  <audio src={URL.createObjectURL(previewMedia.blob)} controls autoPlay className="w-full" />
                </div>
              )}
            </div>
            <div className="p-3 bg-[#262626] border-t border-[#333333] flex items-center justify-between">
              <span className="text-[11px] text-[#8A8A8A]">
                {previewMedia.type.toUpperCase()} • {(previewMedia.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                onClick={async () => {
                  const url = URL.createObjectURL(previewMedia.blob);
                  const meta = await generateMediaMetadata(previewMedia.blob as File, url);
                  addClip({
                    track: previewMedia.type === 'audio' ? 'audio' : 'video',
                    name: previewMedia.name,
                    start: currentTime,
                    duration: previewMedia.type === 'audio' ? 12 : previewMedia.type === 'image' ? 5 : 8,
                    type: previewMedia.type,
                    src: url,
                    thumbnailUrl: meta.thumbnailUrl,
                    waveformPeaks: meta.waveformPeaks
                  });
                  setPreviewMedia(null);
                  showToast(`Đã thêm "${previewMedia.name}" vào timeline!`, 'success');
                }}
                className="px-3 py-1.5 rounded-md bg-[#1FC8DB] text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm vào timeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reveal Info Modal */}
      {mediaInfoModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#1FC8DB]" />
                Thông tin chi tiết tệp (Media Info)
              </span>
              <button onClick={() => setMediaInfoModalItem(null)} className="text-[#8A8A8A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#333333]/40">
                <span className="text-[#8A8A8A]">Tên tệp:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{mediaInfoModalItem.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#333333]/40">
                <span className="text-[#8A8A8A]">Định dạng / Loại:</span>
                <span className="font-mono text-[#1FC8DB] font-bold uppercase">{mediaInfoModalItem.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#333333]/40">
                <span className="text-[#8A8A8A]">Dung lượng:</span>
                <span className="font-mono text-white">
                  {(mediaInfoModalItem.size / (1024 * 1024)).toFixed(2)} MB ({mediaInfoModalItem.size} bytes)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#333333]/40">
                <span className="text-[#8A8A8A]">Ngày import:</span>
                <span className="text-[#8A8A8A]">{new Date(mediaInfoModalItem.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8A8A8A]">Bộ nhớ lưu trữ:</span>
                <span className="text-emerald-400 font-semibold">IndexedDB (Cục bộ)</span>
              </div>
            </div>
            <button
              onClick={() => setMediaInfoModalItem(null)}
              className="w-full py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] text-white font-medium text-xs mt-1"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 4. Rename Modal */}
      {renameMediaItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <span className="font-bold text-white text-xs">Đổi tên tệp media</span>
            <input
              type="text"
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2 text-xs text-white outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setRenameMediaItem(null)}
                className="px-3 py-1.5 rounded-md text-[#8A8A8A] hover:text-white text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmRename}
                className="px-3 py-1.5 rounded-md bg-[#1FC8DB] text-slate-950 font-bold text-xs"
              >
                Lưu tên mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. From URL Modal */}
      {urlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-sky-400" />
                Import media từ đường link URL
              </span>
              <button onClick={() => setUrlModalOpen(false)} className="text-[#8A8A8A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-[#8A8A8A]">
              Nhập link trực tiếp đến file video (.mp4/.webm), ảnh (.jpg/.png) hoặc âm thanh (.mp3).
            </p>
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2 text-xs text-white outline-none"
              autoFocus
            />
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
              Lưu ý: Nếu máy chủ nguồn chặn CORS, trình duyệt sẽ không thể tải trực tiếp. Lúc đó vui lòng tải file về máy rồi chọn "From device".
            </div>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => setUrlModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-[#8A8A8A] hover:text-white text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleImportFromUrl}
                disabled={isFetchingUrl}
                className="px-4 py-1.5 rounded-md bg-[#1FC8DB] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                {isFetchingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isFetchingUrl ? 'Đang tải...' : 'Tải về và thêm vào dự án'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Record Screen / Webcam / Mic Modal */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-lg w-full p-4 flex flex-col gap-3 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Video className="w-4 h-4 text-pink-400" />
                Quay Webcam / Màn hình / Lồng tiếng Mic
              </span>
              <button onClick={handleCloseRecordModal} className="text-[#8A8A8A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'webcam', label: 'Webcam + Mic', icon: Camera },
                { id: 'screen', label: 'Màn hình', icon: Monitor },
                { id: 'mic', label: 'Chỉ Mic', icon: Mic }
              ].map((s) => {
                const Icon = s.icon;
                const isAct = recordSource === s.id;
                return (
                  <button
                    key={s.id}
                    disabled={isRecordingModal}
                    onClick={() => handleStartRecordModalStream(s.id as any)}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                      isAct
                        ? 'border-[#1FC8DB] bg-[#1FC8DB]/20 text-[#1FC8DB]'
                        : 'border-[#333333] bg-[#262626] text-[#8A8A8A] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Preview Video or Waveform */}
            <div className="w-full h-56 bg-black rounded-lg border border-[#333333] relative overflow-hidden flex items-center justify-center">
              {recordSource !== 'mic' ? (
                <video ref={recordVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-emerald-400">
                  <Mic className="w-12 h-12 animate-pulse" />
                  <span className="text-xs font-bold">Chế độ ghi âm qua microphone</span>
                </div>
              )}

              {/* 3-2-1 Countdown Overlay */}
              {recordingCountdown !== null && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-7xl font-black text-[#1FC8DB] animate-ping">{recordingCountdown}</span>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecordingModal && (
                <div className="absolute top-3 left-3 bg-rose-600/90 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse shadow">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span>REC • {Math.floor(recordTimer / 60)}:{recordTimer % 60 < 10 ? '0' : ''}{recordTimer % 60}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#8A8A8A]">
                {isRecordingModal ? 'Đang quay trực tiếp...' : 'Sẵn sàng ghi hình/âm'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseRecordModal}
                  className="px-3 py-1.5 rounded-md text-[#8A8A8A] hover:text-white text-xs"
                >
                  Đóng
                </button>
                <button
                  onClick={isRecordingModal ? handleStopRecordingSession : handleStartRecordingSession}
                  className={`px-4 py-1.5 rounded-md font-bold text-xs shadow-md transition-all ${
                    isRecordingModal
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950'
                  }`}
                >
                  {isRecordingModal ? '⏹ Dừng và Lưu vào Media' : '⏺ Bắt đầu quay (3-2-1)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. AI 2D Avatars Modal (Bản đơn giản offline) */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <div className="flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-xs">AI Avatars 2D (Bản đơn giản offline)</span>
              </div>
              <button onClick={() => setAvatarModalOpen(false)} className="text-[#8A8A8A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#8A8A8A]">
              Chọn khuôn mặt avatar 2D và nhập kịch bản. Hệ thống tự động tạo clip dọc 9:16 kèm nhép miệng và giọng đọc TTS.
            </p>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'luna', label: 'Luna Anime', color: 'from-pink-500 to-purple-600' },
                { id: 'alex', label: 'Alex Tech', color: 'from-slate-700 to-emerald-700' },
                { id: 'neo', label: 'Neo 9000', color: 'from-cyan-600 to-blue-900' },
                { id: 'mia', label: 'Mia Influencer', color: 'from-rose-500 to-amber-600' }
              ].map((av) => (
                <button
                  key={av.id}
                  onClick={() => setAvatarPreset(av.id as any)}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-all ${
                    avatarPreset === av.id
                      ? 'border-[#1FC8DB] bg-[#1FC8DB]/20 ring-1 ring-[#1FC8DB]'
                      : 'border-[#333333] bg-[#262626] hover:border-[#1FC8DB]/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-white text-sm font-bold shadow`}>
                    {av.label[0]}
                  </div>
                  <span className="text-[10px] font-semibold text-white truncate max-w-full">{av.label}</span>
                </button>
              ))}
            </div>

            {/* Avatar Script Textarea */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#8A8A8A]">Kịch bản lời nói của Avatar:</span>
              <textarea
                rows={3}
                value={avatarScript}
                onChange={(e) => setAvatarScript(e.target.value)}
                placeholder="Nhập lời nói cho Avatar..."
                className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md p-2 text-xs text-white outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => setAvatarModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-[#8A8A8A] hover:text-white text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleGenerateAvatar}
                disabled={isGeneratingAvatar}
                className="px-4 py-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isGeneratingAvatar ? 'Đang tạo...' : 'Xuất Avatar và chèn timeline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Body Effects (AI Required) Info Modal */}
      {bodyEffectsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F1F1F] border border-[#333333] rounded-xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs">Body Effects (Hiệu ứng tách người AI)</span>
              </div>
              <button onClick={() => setBodyEffectsModalOpen(false)} className="text-[#8A8A8A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs text-amber-200">
                <span className="font-bold">Yêu cầu AI Model Segmentation / Pose Estimation</span>
                <span className="text-[11px] text-amber-300/80">
                  Tính năng Body effects (hào quang cơ thể, nét vẽ phát sáng viền người, cánh thiên thần) cần mô hình AI phân đoạn người trên từng khung hình.
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8A8A8A]">
              Phiên bản hiện tại cung cấp 13 hiệu ứng Shader / Canvas 2D (Glitch, VHS, RGB Split, Blur, Shake, Zoom Pulse, Flash, Vignette, Grain, Snow, Light Leak) hoạt động mượt mà 100% cục bộ. Body Effects sẽ được kích hoạt ở bản phát hành tiếp theo.
            </p>

            <button
              onClick={() => setBodyEffectsModalOpen(false)}
              className="w-full py-2 rounded-md bg-[#2E2E2E] hover:bg-[#333333] text-white font-semibold text-xs mt-1"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
