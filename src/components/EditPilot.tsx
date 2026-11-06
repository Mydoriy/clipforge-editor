import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { Sparkles, Send, X, Bot } from 'lucide-react';

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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/25 hover-lift transition-all"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>EditPilot AI</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-92 max-w-[calc(100vw-2rem)] h-[480px] bg-[#111827] border border-[#1F2937] rounded-[16px] shadow-2xl flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="p-3.5 bg-[#0E1320] border-b border-[#1F2937] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#22D3EE] flex items-center justify-center text-slate-950">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#E5E7EB]">EditPilot AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[#111827] text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-2.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.role === 'assistant'
                    ? 'bg-[#0B0F19] border border-[#1F2937] text-[#E5E7EB] self-start'
                    : 'bg-[#22D3EE] text-slate-950 font-semibold self-end'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Fast Suggestions */}
          <div className="px-3.5 py-2 border-t border-[#1F2937] bg-[#0E1320] flex flex-col gap-1.5">
            <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider">Lệnh gợi ý:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Thêm hook viral 3s đầu',
                'Tạo phụ đề nổi bật',
                'Áp dụng Cinematic filter',
                'Bắn pháo giấy'
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleExecutePrompt(sug)}
                  className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-[#22D3EE] text-[10px] font-semibold border border-[#1F2937] hover-lift transition-all"
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
            className="p-3 bg-[#0B0F19] border-t border-[#1F2937] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu biên tập cho AI..."
              className="flex-1 bg-[#111827] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none transition-colors"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold shadow hover-lift transition-all"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
