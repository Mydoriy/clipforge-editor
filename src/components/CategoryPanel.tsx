import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { audioManager } from '../utils/audio';
import { speakText } from '../utils/tts';
import { db } from '../db';
import confetti from 'canvas-confetti';
import {
  FolderOpen,
  Music,
  Type,
  Smile,
  Sparkles,
  Zap,
  Subtitles,
  Flame,
  Shapes,
  Volume2,
  LayoutTemplate,
  Upload,
  Play
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

  const [ttsInput, setTtsInput] = useState('Chào mừng bạn đến với ClipForge Studio bản web');
  const [ttsLang, setTtsLang] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const t = translations[language];

  const tabs = [
    { id: 'Media', label: t.tabMedia, icon: FolderOpen },
    { id: 'Audio', label: t.tabAudio, icon: Music },
    { id: 'Text', label: t.tabText, icon: Type },
    { id: 'Stickers', label: t.tabStickers, icon: Smile },
    { id: 'Effects', label: t.tabEffects, icon: Sparkles },
    { id: 'HookLab', label: t.tabHookLab, icon: Flame },
    { id: 'Particles', label: t.tabParticles, icon: Zap },
    { id: 'AiVoice', label: t.tabAiVoice, icon: Volume2 },
    { id: 'Templates', label: t.tabTemplates, icon: LayoutTemplate }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');

      // Save to Dexie IndexedDB
      await db.media.add({
        id: 'media-' + Date.now(),
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });

      addClip({
        track: isAudio ? 'audio' : 'video',
        name: file.name,
        start: currentTime,
        duration: isAudio ? 10 : 8,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image'
      });

      showToast(`Đã tải lên và lưu IndexedDB: ${file.name}`, 'success');
    } catch (err) {
      showToast('Lỗi khi đọc file', 'error');
    }
  };

  const handleTriggerParticles = (type: 'confetti' | 'hearts' | 'sparkles') => {
    if (type === 'confetti') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    addClip({
      track: 'sticker',
      name: `Particles (${type})`,
      start: currentTime,
      duration: 4,
      type: 'particle',
      particleType: type
    });
    showToast(`Đã thêm hiệu ứng hạt: ${type}`, 'success');
  };

  const viralHooks = [
    '🔥 DỪNG LẠI 3 GIÂY NẾU BẠN MUỐN BIẾT ĐIỀU NÀY',
    '⚡ 90% NGƯỜI LÀM VIDEO BỎ QUA BƯỚC NÀY',
    '🚀 CÁCH XÂY KÊNH TIKTOK TỪ 0 LÊN 100K FOLLOW',
    '💡 ĐỪNG MUA IPHONE NẾU BẠN CHƯA BIẾT MẸO NÀY',
    '💰 BÍ QUYẾT TĂNG DOANH SỐ GẤP 3 LẦN TRONG 7 NGÀY'
  ];

  return (
    <div className="w-80 bg-[#11141c] border-r border-[#1e2430] flex flex-col select-none shrink-0 overflow-hidden">
      {/* Category Tabs Top Bar */}
      <div className="flex items-center gap-1 p-2 bg-[#0d1017] border-b border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Body Content */}
      <div className="flex-1 p-4 overflow-y-auto text-xs text-slate-300">
        {/* MEDIA TAB */}
        {activeTab === 'Media' && (
          <div className="flex flex-col gap-4">
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center">
              <Upload className="w-8 h-8 text-cyan-400" />
              <span className="font-semibold text-slate-200">Kéo thả hoặc tải file lên</span>
              <span className="text-[11px] text-slate-500">Hỗ trợ MP4, WEBM, PNG, JPG, MP3 (Lưu vào IndexedDB offline)</span>
              <input
                type="file"
                accept="video/*,image/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Kho mẫu dựng sẵn (Stock Assets)</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Cyberpunk Neon City',
                      start: currentTime,
                      duration: 8,
                      type: 'video',
                      filter: 'cinematic'
                    });
                    showToast('Đã thêm Stock Clip 9:16 vào timeline');
                  }}
                  className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="font-semibold text-slate-200">Cyberpunk 9:16</span>
                  <span className="text-[10px] text-cyan-400">Video 8s</span>
                </button>

                <button
                  onClick={() => {
                    addClip({
                      track: 'video',
                      name: 'Anime Aesthetic Vibe',
                      start: currentTime,
                      duration: 10,
                      type: 'video',
                      filter: 'vhs'
                    });
                    showToast('Đã thêm Anime Stock vào timeline');
                  }}
                  className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-left flex flex-col gap-1 transition-colors"
                >
                  <span className="font-semibold text-slate-200">Anime Aesthetic</span>
                  <span className="text-[10px] text-purple-400">Video 10s</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'Audio' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Hiệu ứng âm thanh (Web Audio Synthesizer)</span>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">Chime Chuông Thành Công</span>
                  <span className="text-[10px] text-slate-400">Tần số cao C5-E5-G5</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => audioManager.playChime('success')}
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                    title="Nghe thử"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      addClip({
                        track: 'audio',
                        name: 'Chime Sound FX',
                        start: currentTime,
                        duration: 1.5,
                        type: 'audio'
                      });
                      showToast('Đã thêm Chime FX vào timeline');
                    }}
                    className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-200">Sub Bass Kick Beat</span>
                  <span className="text-[10px] text-slate-400">Sub-bass 120Hz</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => audioManager.playChime('beat')}
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                    title="Nghe thử"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      addClip({
                        track: 'audio',
                        name: 'Sub-bass Beat',
                        start: currentTime,
                        duration: 2,
                        type: 'audio'
                      });
                      showToast('Đã thêm Beat FX vào timeline');
                    }}
                    className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]"
                  >
                    + Thêm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'Text' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Mẫu chữ & Phụ đề Hot Trend</span>
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
                    y: -100
                  });
                  showToast('Đã thêm phụ đề kiểu Alex Hormozi');
                }}
                className="p-3 rounded-lg bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-left flex justify-between items-center transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-black text-amber-300 text-sm">TIỀN VỀ ĐẦY TÚI 💸</span>
                  <span className="text-[10px] text-slate-400">Phong cách Hormozi đậm nét</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">+ Áp dụng</span>
              </button>

              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'Neon Glow Subtitle',
                    start: currentTime,
                    duration: 3,
                    type: 'text',
                    text: '✨ BÍ MẬT TRIỆU VIEW ✨',
                    scale: 1,
                    y: -140
                  });
                  showToast('Đã thêm chữ Neon Glow');
                }}
                className="p-3 rounded-lg bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-left flex justify-between items-center transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-black text-cyan-300 text-sm">✨ BÍ MẬT TRIỆU VIEW ✨</span>
                  <span className="text-[10px] text-slate-400">Cyber Neon phát sáng</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold">+ Áp dụng</span>
              </button>
            </div>
          </div>
        )}

        {/* HOOK LAB TAB */}
        {activeTab === 'HookLab' && (
          <div className="flex flex-col gap-2.5">
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                Hook Lab - Giữ chân người xem trong 3 giây đầu
              </span>
              <p className="text-[11px] text-slate-300 mt-1">
                Chọn câu hook viral bên dưới để chèn tự động vào giây 0:00 của video:
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {viralHooks.map((hook, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    addClip({
                      track: 'text',
                      name: `Hook #${idx + 1}`,
                      start: 0,
                      duration: 3.5,
                      type: 'text',
                      text: hook,
                      scale: 1.15,
                      y: -120
                    });
                    showToast('Đã chèn Hook vào 3 giây đầu!', 'success');
                  }}
                  className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/80 text-left font-bold text-slate-200 text-xs transition-all flex items-start gap-2"
                >
                  <span className="text-amber-400 font-mono">#{idx + 1}</span>
                  <span>{hook}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === 'Stickers' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Stickers & Biểu tượng cảm xúc</span>
            <div className="grid grid-cols-4 gap-2">
              {['🔥', '✨', '🚀', '💯', '🎯', '🎬', '💎', '👑', '🎉', '⚡', '💡', '🏆'].map((emoji, idx) => (
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
                  className="h-14 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-2xl transition-all transform hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PARTICLES TAB */}
        {activeTab === 'Particles' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Hiệu ứng hạt tương tác (Canvas / Confetti)</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleTriggerParticles('confetti')}
                className="p-3 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 hover:border-pink-400 text-left flex justify-between items-center transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-pink-300">🎉 Pháo giấy Confetti</span>
                  <span className="text-[10px] text-slate-400">Bắn pháo giấy ăn mừng rực rỡ</span>
                </div>
                <span className="px-2 py-1 rounded bg-pink-500 text-slate-950 font-bold text-[10px]">
                  Bắn ngay
                </span>
              </button>

              <button
                onClick={() => handleTriggerParticles('sparkles')}
                className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-sky-500/20 border border-cyan-500/40 hover:border-cyan-400 text-left flex justify-between items-center transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-cyan-300">✨ Bụi sáng phát quang (Sparkles)</span>
                  <span className="text-[10px] text-slate-400">Hạt lấp lánh trôi nhẹ trên video</span>
                </div>
                <span className="px-2 py-1 rounded bg-cyan-400 text-slate-950 font-bold text-[10px]">
                  + Thêm
                </span>
              </button>
            </div>
          </div>
        )}

        {/* AI VOICE TAB */}
        {activeTab === 'AiVoice' && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Chuyển văn bản thành giọng nói (Web Speech API)</span>
            <div className="flex flex-col gap-2">
              <textarea
                rows={3}
                value={ttsInput}
                onChange={(e) => setTtsInput(e.target.value)}
                placeholder="Nhập nội dung muốn đọc..."
                className="bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg p-2.5 text-xs text-slate-100 outline-none resize-none"
              />

              <div className="flex items-center gap-2">
                <select
                  value={ttsLang}
                  onChange={(e) => setTtsLang(e.target.value as any)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none"
                >
                  <option value="vi-VN">Tiếng Việt (Giọng chuẩn)</option>
                  <option value="en-US">English (US Natural)</option>
                </select>

                <button
                  onClick={async () => {
                    try {
                      await speakText(ttsInput, ttsLang);
                      showToast('Đang phát giọng đọc AI...', 'info');
                    } catch (e: any) {
                      showToast(e.message || 'Không thể phát âm thanh', 'error');
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Đọc thử</span>
                </button>
              </div>

              <button
                onClick={() => {
                  addClip({
                    track: 'audio',
                    name: `AI Voice: "${ttsInput.slice(0, 15)}..."`,
                    start: currentTime,
                    duration: 4,
                    type: 'audio'
                  });
                  showToast('Đã thêm Audio track giọng đọc AI vào timeline!');
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold border border-cyan-500/30 text-xs"
              >
                + Chèn giọng đọc vào Timeline
              </button>
            </div>
          </div>
        )}

        {/* EFFECTS & TEMPLATES FALLBACK */}
        {(activeTab === 'Effects' || activeTab === 'Templates') && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Bộ lọc màu và hiệu ứng</span>
            {['Cinematic Film', 'Retro VHS 1990', 'Warm Sunset', 'Black & White Noir'].map((filterName, i) => (
              <button
                key={i}
                onClick={() => {
                  const videoClip = clips.find((c) => c.track === 'video');
                  if (videoClip) {
                    const code = filterName.toLowerCase().includes('vhs')
                      ? 'vhs'
                      : filterName.toLowerCase().includes('cinematic')
                      ? 'cinematic'
                      : 'warm';
                    updateClip(videoClip.id, { filter: code });
                    showToast(`Đã áp dụng hiệu ứng: ${filterName}`, 'success');
                  }
                }}
                className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left flex justify-between items-center"
              >
                <span className="font-semibold text-slate-200">{filterName}</span>
                <span className="text-[10px] text-cyan-400 font-bold">+ Áp dụng</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

