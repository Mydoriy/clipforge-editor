import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { audioManager } from '../utils/audio';
import { db, type MediaEntity } from '../db';
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
  Flame,
  Volume2,
  Mic,
  FileText,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

export const CategoryPanel: React.FC = () => {
  const {
    language,
    activeTab,
    setActiveTab,
    addClip,
    currentTime,
    showToast,
    updateClip,
    clips
  } = useEditorStore();

  const t = translations[language];

  // Media Library state from Dexie
  const [dbMediaList, setDbMediaList] = useState<MediaEntity[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  const tabs = [
    { id: 'Media', label: t.tabMedia, icon: FolderOpen },
    { id: 'Audio', label: t.tabAudio, icon: Music },
    { id: 'Text', label: t.tabText, icon: Type },
    { id: 'Stickers', label: t.tabStickers, icon: Smile },
    { id: 'Effects', label: t.tabEffects, icon: Sparkles },
    { id: 'Transitions', label: t.tabTransitions, icon: Layers },
    { id: 'Filters', label: t.tabFilters, icon: SlidersHorizontal },
    { id: 'Captions', label: t.tabCaptions, icon: Subtitles }
  ];

  // File import handler (drag & drop and file input)
  const processImportedFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'mp3', 'wav'];
    const isVideo = file.type.startsWith('video') || ['mp4', 'mov', 'webm'].includes(ext);
    const isAudio = file.type.startsWith('audio') || ['mp3', 'wav'].includes(ext);
    const isImage = file.type.startsWith('image') || ['jpg', 'jpeg', 'png'].includes(ext);

    if (!isVideo && !isAudio && !isImage && !validExts.includes(ext)) {
      showToast('Định dạng không được hỗ trợ. Vui lòng chọn mp4, mov, webm, jpg, png, mp3, wav', 'warning');
      return;
    }

    try {
      const mediaId = 'media-' + Date.now();
      const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      const fileUrl = URL.createObjectURL(file);

      // Save to Dexie IndexedDB
      await db.media.add({
        id: mediaId,
        name: file.name,
        type: mediaType,
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });

      // Add to timeline
      addClip({
        track: isAudio ? 'audio' : 'video',
        name: file.name,
        start: currentTime,
        duration: isAudio ? 12 : isImage ? 5 : 8,
        type: mediaType,
        src: fileUrl
      });

      await loadMedia();
      showToast(`Đã import và lưu IndexedDB: ${file.name}`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi lưu file: ' + err.message, 'error');
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
      setSpeechError(
        'Trình duyệt này chưa hỗ trợ Web Speech API trực tiếp. Vui lòng sử dụng Google Chrome / Microsoft Edge hoặc dùng mục "Nhập tay" / "Import SRT" bên dưới!'
      );
      showToast('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome/Edge hoặc import SRT!', 'warning');
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
    <div className="w-80 bg-[#0E1320] border-r border-[#1F2937] flex flex-col select-none shrink-0 overflow-hidden">
      {/* Category Tabs Top Bar */}
      <div className="flex items-center gap-1 p-2 bg-[#0B0F19] border-b border-[#1F2937] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Body Content */}
      <div className="flex-1 p-4 overflow-y-auto text-xs text-[#E5E7EB]">
        {/* 1. MEDIA TAB */}
        {activeTab === 'Media' && (
          <div className="flex flex-col gap-4">
            {/* Drag and Drop Zone */}
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center ${
                isDraggingOver
                  ? 'border-[#22D3EE] bg-[#22D3EE]/10 scale-[1.01]'
                  : 'border-[#1F2937] hover:border-[#22D3EE]/60 bg-[#111827]/60 hover:bg-[#111827]'
              }`}
            >
              <Upload className="w-8 h-8 text-[#22D3EE]" />
              <span className="font-semibold text-white">Kéo thả hoặc chọn file tải lên</span>
              <span className="text-[11px] text-[#9CA3AF]">
                MP4, MOV, WEBM, JPG, PNG, MP3, WAV (Lưu vào Dexie IndexedDB)
              </span>
              <input
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,audio/mpeg,audio/wav,video/*,image/*,audio/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>

            {/* Uploaded Library Assets */}
            {dbMediaList.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                  Thư viện đã tải lên ({dbMediaList.length})
                </span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {dbMediaList.map((media) => (
                    <div
                      key={media.id}
                      className="p-2 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-between gap-2 hover:border-[#22D3EE]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#0B0F19] text-[#22D3EE] border border-[#1F2937]">
                          {media.type}
                        </span>
                        <span className="text-xs text-[#E5E7EB] truncate font-medium">{media.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(media.blob);
                          addClip({
                            track: media.type === 'audio' ? 'audio' : 'video',
                            name: media.name,
                            start: currentTime,
                            duration: media.type === 'audio' ? 12 : media.type === 'image' ? 5 : 8,
                            type: media.type,
                            src: url
                          });
                          showToast(`Đã chèn "${media.name}" vào timeline!`, 'success');
                        }}
                        className="px-2 py-1 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-black font-semibold text-[10px] shrink-0 transition-colors"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock 9:16 Assets */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">Kho mẫu 9:16 dựng sẵn</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Cyberpunk Neon 9:16',
                      start: currentTime,
                      duration: 8,
                      type: 'video',
                      filter: 'cyberpunk'
                    });
                    showToast('Đã thêm Stock Clip 9:16 vào timeline');
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] text-left flex flex-col gap-1 transition-all hover-lift"
                >
                  <span className="font-semibold text-white">Cyberpunk Neon</span>
                  <span className="text-[10px] text-[#22D3EE]">Video 8s • 9:16</span>
                </button>

                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Anime Aesthetic 9:16',
                      start: currentTime,
                      duration: 10,
                      type: 'video',
                      filter: 'vhs'
                    });
                    showToast('Đã thêm Anime Stock vào timeline');
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] text-left flex flex-col gap-1 transition-all hover-lift"
                >
                  <span className="font-semibold text-white">Anime Aesthetic</span>
                  <span className="text-[10px] text-purple-400">Video 10s • 9:16</span>
                </button>

                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Cinematic Sunset 9:16',
                      start: currentTime,
                      duration: 8,
                      type: 'video',
                      filter: 'warm'
                    });
                    showToast('Đã thêm Sunset 9:16 vào timeline');
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] text-left flex flex-col gap-1 transition-all hover-lift"
                >
                  <span className="font-semibold text-white">Golden Sunset</span>
                  <span className="text-[10px] text-amber-400">Video 8s • 9:16</span>
                </button>

                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Noir Monochrome 9:16',
                      start: currentTime,
                      duration: 8,
                      type: 'video',
                      filter: 'noir'
                    });
                    showToast('Đã thêm Noir B&W vào timeline');
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] text-left flex flex-col gap-1 transition-all hover-lift"
                >
                  <span className="font-semibold text-white">Noir Classic</span>
                  <span className="text-[10px] text-slate-400">Video 8s • 9:16</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. AUDIO TAB */}
        {activeTab === 'Audio' && (
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Hiệu ứng âm thanh (Web Audio Synthesizer)
            </span>

            <div className="flex flex-col gap-2">
              {[
                { name: 'Chime Chuông Thành Công', sub: 'Tần số C5-E5-G5', type: 'success', dur: 1.5 },
                { name: 'Sub Bass Kick Beat', sub: 'Tần số trầm 120Hz', type: 'beat', dur: 2 },
                { name: 'UI Click Pop', sub: 'Âm gõ nhanh 800Hz', type: 'click', dur: 0.5 }
              ].map((sfx, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{sfx.name}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{sfx.sub}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => audioManager.playChime(sfx.type as any)}
                      className="p-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-white"
                      title="Nghe thử"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => {
                        addClip({
                          track: 'audio',
                          name: sfx.name,
                          start: currentTime,
                          duration: sfx.dur,
                          type: 'audio',
                          volume: 1
                        });
                        showToast(`Đã thêm ${sfx.name} vào timeline`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-semibold text-[10px] transition-colors"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase mt-2">
              Nhạc nền Viral TikTok / Reels
            </span>
            <div className="flex flex-col gap-2">
              {[
                { title: 'Lo-Fi Chill Study Beat', duration: 15, tag: 'Thư giãn' },
                { title: 'Viral Phonk Drift Speed', duration: 15, tag: 'Sôi động' },
                { title: 'Aesthetic Vlog Acoustic', duration: 15, tag: 'Vlog ngày mới' }
              ].map((bgm, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{bgm.title}</span>
                    <span className="text-[10px] text-[#22D3EE]">{bgm.tag} • {bgm.duration}s</span>
                  </div>
                  <button
                    onClick={() => {
                      addClip({
                        track: 'audio',
                        name: bgm.title,
                        start: currentTime,
                        duration: bgm.duration,
                        type: 'audio',
                        volume: 0.8
                      });
                      showToast(`Đã thêm BGM "${bgm.title}"`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-black font-semibold text-[10px] transition-colors"
                  >
                    + Thêm
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. TEXT TAB */}
        {activeTab === 'Text' && (
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Mẫu chữ & Typo Hot Trend
            </span>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'Alex Hormozi Title',
                    start: currentTime,
                    duration: 3.5,
                    type: 'text',
                    text: 'TIỀN VỀ ĐẦY TÚI 💸',
                    scale: 1.2,
                    y: -100,
                    textAnimIn: 'pop'
                  });
                  showToast('Đã thêm chữ kiểu Alex Hormozi');
                }}
                className="p-3 rounded-xl bg-[#111827] border border-amber-500/40 hover:border-amber-400 text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-black text-amber-300 text-sm tracking-wide">TIỀN VỀ ĐẦY TÚI 💸</span>
                  <span className="text-[10px] text-[#9CA3AF]">Phong cách Alex Hormozi vàng đậm</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">+ Áp dụng</span>
              </button>

              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'Neon Glow Cyber',
                    start: currentTime,
                    duration: 3.5,
                    type: 'text',
                    text: '✨ BÍ MẬT TRIỆU VIEW ✨',
                    scale: 1.1,
                    y: -120,
                    textAnimIn: 'fadeIn'
                  });
                  showToast('Đã thêm chữ Cyber Neon phát sáng');
                }}
                className="p-3 rounded-xl bg-[#111827] border border-[#22D3EE]/40 hover:border-[#22D3EE] text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-black text-[#22D3EE] text-sm tracking-wide">✨ BÍ MẬT TRIỆU VIEW ✨</span>
                  <span className="text-[10px] text-[#9CA3AF]">Cyber Neon phát quang rực rỡ</span>
                </div>
                <span className="text-[10px] text-[#22D3EE] font-bold">+ Áp dụng</span>
              </button>

              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'Viral TikTok Red',
                    start: currentTime,
                    duration: 3.5,
                    type: 'text',
                    text: '🔥 ĐỪNG BỎ QUA ĐIỀU NÀY',
                    scale: 1.1,
                    y: -100,
                    textAnimIn: 'slideUp'
                  });
                  showToast('Đã thêm chữ Viral TikTok');
                }}
                className="p-3 rounded-xl bg-[#111827] border border-rose-500/40 hover:border-rose-400 text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-black text-rose-300 text-sm tracking-wide">🔥 ĐỪNG BỎ QUA ĐIỀU NÀY</span>
                  <span className="text-[10px] text-[#9CA3AF]">Đỏ cảnh báo thu hút sự chú ý</span>
                </div>
                <span className="text-[10px] text-rose-400 font-bold">+ Áp dụng</span>
              </button>

              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'Minimal Clean',
                    start: currentTime,
                    duration: 4,
                    type: 'text',
                    text: 'MINIMAL VIBES 2026',
                    scale: 0.95,
                    y: -130,
                    textAnimIn: 'fadeIn'
                  });
                  showToast('Đã thêm chữ Minimal Clean');
                }}
                className="p-3 rounded-xl bg-[#111827] border border-slate-700 hover:border-white text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200 text-sm tracking-wider">MINIMAL VIBES 2026</span>
                  <span className="text-[10px] text-[#9CA3AF]">Tối giản, tinh tế cho vlog sang trọng</span>
                </div>
                <span className="text-[10px] text-white font-bold">+ Áp dụng</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. STICKERS TAB */}
        {activeTab === 'Stickers' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Stickers & Biểu tượng cảm xúc
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                '🔥', '✨', '🚀', '💯', '🎯', '🎬', '💎', '👑',
                '🎉', '⚡', '💡', '🏆', '💖', '👏', '🚨', '🌟'
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
                  className="h-14 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] flex items-center justify-center text-2xl transition-all transform hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. EFFECTS TAB */}
        {activeTab === 'Effects' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Hiệu ứng hình ảnh (Canvas FX & Hạt)
            </span>
            <div className="flex flex-col gap-2">
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
                className="p-3 rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/30 hover:border-pink-400 text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-pink-300">🎉 Pháo giấy Confetti</span>
                  <span className="text-[10px] text-[#9CA3AF]">Bắn pháo giấy ăn mừng rực rỡ</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-pink-500 text-slate-950 font-bold text-[10px]">
                  Bắn ngay
                </span>
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
                  showToast('Đã thêm hạt phát quang lấp lánh');
                }}
                className="p-3 rounded-xl bg-gradient-to-r from-[#22D3EE]/15 to-sky-500/15 border border-[#22D3EE]/30 hover:border-[#22D3EE] text-left flex justify-between items-center transition-all hover-lift"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-[#22D3EE]">✨ Hạt sáng Sparkles</span>
                  <span className="text-[10px] text-[#9CA3AF]">Bụi ánh sáng bay bổng huyền ảo</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#22D3EE] text-slate-950 font-bold text-[10px]">
                  + Thêm
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 6. TRANSITIONS TAB */}
        {activeTab === 'Transitions' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Hiệu ứng chuyển cảnh (Transitions)
            </span>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Mờ dần vào đen (Fade to Black)', type: 'fade', desc: 'Chuyển cảnh êm dịu' },
                { name: 'Hòa tan mềm (Cross Dissolve)', type: 'dissolve', desc: 'Tan chảy giữa 2 khung hình' },
                { name: 'Lướt ngang (Whip Pan / Slide)', type: 'wipe', desc: 'Chuyển cảnh tốc độ nhanh' },
                { name: 'Phóng to lóe sáng (Zoom Flash)', type: 'zoom', desc: 'Zoom mạnh kèm ánh sáng trắng' },
                { name: 'Nhiễu sóng (Glitch Cut)', type: 'glitch', desc: 'Chớp giật kỹ thuật số hiện đại' }
              ].map((trans, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const videoClip = clips.find((c) => c.track === 'video');
                    if (videoClip) {
                      updateClip(videoClip.id, { transitionType: trans.type });
                      showToast(`Đã áp dụng chuyển cảnh: ${trans.name}`, 'success');
                    } else {
                      addClip({
                        track: 'transition',
                        name: trans.name,
                        start: currentTime,
                        duration: 1.5,
                        type: 'transition',
                        transitionType: trans.type
                      });
                      showToast(`Đã thêm ${trans.name} vào timeline!`, 'success');
                    }
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] hover:border-[#22D3EE]/50 text-left flex justify-between items-center transition-all hover-lift"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{trans.name}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{trans.desc}</span>
                  </div>
                  <span className="text-[10px] text-[#22D3EE] font-bold">+ Áp dụng</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. FILTERS TAB */}
        {activeTab === 'Filters' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
              Bộ lọc màu điện ảnh (Color Grading LUTs)
            </span>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Gốc (None / Standard)', code: 'none', color: '#64748b' },
                { name: 'Cinematic Moody (Teal & Orange)', code: 'cinematic', color: '#0ea5e9' },
                { name: 'Retro VHS 1990', code: 'vhs', color: '#a855f7' },
                { name: 'Warm Sunset (Ấm áp)', code: 'warm', color: '#f59e0b' },
                { name: 'Noir Black & White (Đen trắng)', code: 'noir', color: '#ffffff' },
                { name: 'Cyberpunk Neon', code: 'cyberpunk', color: '#ec4899' },
                { name: 'Vintage 70s', code: 'vintage', color: '#d97706' },
                { name: 'Vivid Pop (Rực rỡ)', code: 'vivid', color: '#10b981' }
              ].map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const videoClip = clips.find((c) => c.track === 'video');
                    if (videoClip) {
                      updateClip(videoClip.id, { filter: f.code });
                      showToast(`Đã áp dụng bộ lọc: ${f.name}`, 'success');
                    } else {
                      showToast('Hãy thêm hoặc chọn một clip video để áp dụng bộ lọc!', 'info');
                    }
                  }}
                  className="p-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#1F2937] hover:border-[#22D3EE]/50 text-left flex justify-between items-center transition-all hover-lift"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="font-semibold text-white">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-[#22D3EE] font-bold">+ Chọn</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 8. CAPTIONS TAB */}
        {activeTab === 'Captions' && (
          <div className="flex flex-col gap-4">
            {/* Auto Captions Button (Web Speech API) */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#22D3EE]/10 to-indigo-500/10 border border-[#22D3EE]/30">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#22D3EE]" />
                Tự động nhận diện giọng nói (Auto Captions)
              </span>
              <p className="text-[11px] text-[#9CA3AF]">
                Sử dụng Web Speech API để tự động chuyển lời nói thành từng câu phụ đề đồng bộ trên timeline.
              </p>

              <button
                onClick={handleAutoCaptions}
                disabled={isListeningSpeech}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isListeningSpeech
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-[#22D3EE] to-sky-400 hover:from-[#22D3EE] hover:to-sky-300 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isListeningSpeech ? 'Đang nghe micro...' : 'Bắt đầu nhận diện (Auto)'}</span>
              </button>

              {speechError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{speechError}</span>
                </div>
              )}
            </div>

            {/* Manual Caption Add */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                Nhập phụ đề thủ công
              </span>
              <textarea
                rows={2}
                value={manualCaptionText}
                onChange={(e) => setManualCaptionText(e.target.value)}
                placeholder="Nhập nội dung câu phụ đề tại đây..."
                className="bg-[#111827] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl p-2.5 text-xs text-white outline-none resize-none"
              />

              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>Thời lượng hiển thị:</span>
                <span className="font-mono text-[#22D3EE] font-bold">{manualCaptionDuration} giây</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={manualCaptionDuration}
                onChange={(e) => setManualCaptionDuration(parseFloat(e.target.value))}
                className="accent-[#22D3EE] cursor-pointer"
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
                    scale: 1.1,
                    y: -110,
                    textAnimIn: 'pop'
                  });
                  setManualCaptionText('');
                  showToast('Đã thêm câu phụ đề vào timeline!', 'success');
                }}
                className="py-2.5 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-[#22D3EE]/40 text-[#22D3EE] font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover-lift"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm câu phụ đề này</span>
              </button>
            </div>

            {/* Import SRT Subtitles */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                Nhập từ tệp phụ đề (Import SRT)
              </span>
              <p className="text-[11px] text-[#9CA3AF]">
                Tự động trích xuất các mốc thời gian và nội dung từ file `.srt` chuẩn.
              </p>

              <label className="p-3 rounded-xl border border-dashed border-[#1F2937] hover:border-[#22D3EE] bg-[#111827] flex items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                <FileText className="w-4 h-4 text-[#22D3EE]" />
                <span className="font-semibold text-xs text-white">Chọn tệp phụ đề .SRT</span>
                <input
                  type="file"
                  accept=".srt,text/plain"
                  onChange={handleImportSrt}
                  className="hidden"
                />
              </label>

              {/* Sample SRT Generator for Quick Testing */}
              <button
                onClick={() => {
                  const sampleCaptions = [
                    { start: 0, dur: 3, text: 'CHÀO MỪNG BẠN ĐẾN VỚI CAPCUT WEB 3.0' },
                    { start: 3.5, dur: 3.5, text: 'VIDEO DỌC 9:16 ĐƯỢC XỬ LÝ 100% CỤC BỘ' },
                    { start: 7.5, dur: 3.5, text: 'XUẤT VIDEO SIÊU TỐC VỚI CANVAS & WEBM' }
                  ];
                  sampleCaptions.forEach((c) => {
                    addClip({
                      track: 'text',
                      name: `Sub: "${c.text.slice(0, 15)}..."`,
                      start: c.start,
                      duration: c.dur,
                      type: 'text',
                      text: c.text,
                      scale: 1.1,
                      y: -110,
                      textAnimIn: 'pop'
                    });
                  });
                  showToast('Đã nạp bộ phụ đề SRT mẫu gồm 3 câu!', 'success');
                }}
                className="py-1.5 text-[11px] text-[#9CA3AF] hover:text-[#22D3EE] underline text-center"
              >
                Hoặc bấm để thử nạp 3 câu phụ đề mẫu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
