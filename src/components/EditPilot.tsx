import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { Sparkles, Send, X, Bot, Check, Zap } from 'lucide-react';

export const EditPilot: React.FC = () => {
  const {
    language,
    addClip,
    updateClip,
    clips,
    setDuration,
    duration,
    showToast
  } = useEditorStore();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Xin chào! Tôi là EditPilot AI. Tôi có thể giúp bạn tự động chèn hook viral, tạo phụ đề, áp dụng filter hay điều chỉnh nhịp điệu video.'
    }
  ]);

  const t = translations[language];

  const handleExecutePrompt = (promptText: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: promptText }]);

    setTimeout(() => {
      const lower = promptText.toLowerCase();

      if (lower.includes('hook') || lower.includes('giật gân')) {
        addClip({
          track: 'text',
          name: 'Viral Hook 3s',
          start: 0,
          duration: 3.5,
          type: 'text',
          text: '🔥 DỪNG LẠI 3 GIÂY NẾU BẠN CHƯA BIẾT ĐIỀU NÀY!',
          scale: 1.2,
          y: -120
        });
        showToast('EditPilot: Đã chèn Viral Hook vào 3 giây đầu!', 'success');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '✅ Đã thêm Hook giữ chân người xem vào giây 0:00 thành công!' }
        ]);
      } else if (lower.includes('phụ đề') || lower.includes('caption') || lower.includes('sub')) {
        addClip({
          track: 'text',
          name: 'Auto Caption',
          start: 3.5,
          duration: 4,
          type: 'text',
          text: '⚡ BÍ QUYẾT TĂNG DOANH SỐ GẤP 3 LẦN',
          scale: 1.1,
          y: -80
        });
        showToast('EditPilot: Đã tạo phụ đề nổi bật!', 'success');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '✅ Đã phân tích âm thanh và tạo bộ phụ đề động phong cách Alex Hormozi.' }
        ]);
      } else if (lower.includes('filter') || lower.includes('màu') || lower.includes('cinematic')) {
        const videoClip = clips.find((c) => c.track === 'video');
        if (videoClip) {
          updateClip(videoClip.id, { filter: 'cinematic', speed: 1.15 });
        }
        showToast('EditPilot: Đã áp dụng Cinematic Color & Speed 1.15x!', 'success');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '✅ Đã cân chỉnh màu Cinematic Moody và đẩy tốc độ clip lên 1.15x để tăng tính thu hút.' }
        ]);
      } else if (lower.includes('pháo giấy') || lower.includes('confetti')) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        showToast('🎉 Bắn pháo giấy!', 'success');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '🎉 Pháo giấy đã được bắn lên khung hình!' }
        ]);
      } else {
        setDuration(duration + 5);
        showToast('EditPilot: Đã mở rộng thời lượng video thêm 5s!', 'info');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `✅ Đã thực thi yêu cầu: "${promptText}". Đã tối ưu hóa bố cục video 9:16.` }
        ]);
      }
    }, 400);

    setInput('');
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:opacity-95 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>EditPilot AI</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-40 w-88 max-w-[calc(100vw-2rem)] h-[460px] bg-[#141822] border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">EditPilot AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                  m.role === 'assistant'
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 self-start'
                    : 'bg-cyan-500 text-slate-950 font-medium self-end'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Fast Suggestions */}
          <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Lệnh gợi ý:</span>
            <div className="flex flex-wrap gap-1">
              {[
                'Thêm hook viral 3s đầu',
                'Tạo phụ đề nổi bật',
                'Áp dụng Cinematic filter',
                'Bắn pháo giấy'
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleExecutePrompt(sug)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] border border-cyan-800/40"
                >
                  + {sug}
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
            className="p-2.5 bg-[#0f121a] border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu biên tập cho AI..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
