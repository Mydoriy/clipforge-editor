import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';
import { db, type ProjectEntity } from '../db';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, X, Bot, Zap, ArrowRight } from 'lucide-react';

export const EditPilot: React.FC = () => {
  const navigate = useNavigate();
  const {
    language,
    addClip,
    updateClip,
    clips,
    setDuration,
    duration,
    showToast,
    openModal,
    settings,
    currentProjectId,
    setCurrentProjectId,
    setProjectTitle,
    editPilotOpen,
    setEditPilotOpen,
    chatHistory,
    addChatMessage
  } = useEditorStore();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const t = translations[language];

  // Active project chat messages or general
  const activeProjectId = currentProjectId || 'general';
  const projectMessages = chatHistory[activeProjectId] || [
    {
      id: 'init-msg',
      role: 'assistant',
      text: 'Xin chào! Tôi là EditPilot AI. Bạn có thể ra lệnh bằng tiếng Việt hoặc tiếng Anh (VD: "cắt 5 giây đầu", "tăng tốc 2x", "thêm chữ Xin chào", "làm sáng video", "tắt tiếng", "xuất video").',
      time: '00:00'
    }
  ];

  // Ensure project exists before executing editing actions
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
            { id: 'c1', track: 'video', name: 'Video 9:16', start: 0, duration: 15, type: 'video' },
            { id: 'c2', track: 'text', name: 'Chữ tiêu đề', start: 0, duration: 4, type: 'text', text: '🔥 CLIP MỚI' }
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

  // Execute an action on the video
  const executeAction = (action: string, value?: any) => {
    switch (action) {
      case 'trim': {
        const secs = typeof value === 'number' ? value : 5;
        const videoClip = clips.find((c) => c.track === 'video');
        if (videoClip) {
          updateClip(videoClip.id, { start: secs, duration: Math.max(1, videoClip.duration - secs) });
          showToast(`Đã cắt ${secs} giây đầu của clip!`, 'success');
        }
        break;
      }
      case 'speed': {
        const speedVal = typeof value === 'number' ? value : 2;
        const videoClip = clips.find((c) => c.track === 'video');
        if (videoClip) {
          updateClip(videoClip.id, { speed: speedVal });
          showToast(`Đã chỉnh tốc độ video lên ${speedVal}x!`, 'success');
        }
        break;
      }
      case 'text': {
        const textContent = typeof value === 'string' && value.trim() ? value : 'Xin chào';
        addClip({
          track: 'text',
          name: `Text: ${textContent}`,
          start: 0,
          duration: 4,
          type: 'text',
          text: textContent,
          scale: 1.1,
          y: -100
        });
        showToast(`Đã thêm chữ "${textContent}" vào video!`, 'success');
        break;
      }
      case 'filter': {
        const filterType = value || 'cinematic';
        const videoClip = clips.find((c) => c.track === 'video');
        if (videoClip) {
          updateClip(videoClip.id, { filter: filterType });
          showToast(`Đã áp dụng hiệu ứng làm sáng / ${filterType}!`, 'success');
        }
        break;
      }
      case 'mute': {
        clips.forEach((c) => {
          if (c.track === 'video' || c.track === 'audio') {
            updateClip(c.id, { volume: 0 });
          }
        });
        showToast('Đã tắt tiếng video!', 'info');
        break;
      }
      case 'unmute': {
        clips.forEach((c) => {
          if (c.track === 'video' || c.track === 'audio') {
            updateClip(c.id, { volume: 1 });
          }
        });
        showToast('Đã bật lại âm thanh!', 'info');
        break;
      }
      case 'export': {
        openModal('export');
        showToast('Đang mở bảng xuất video...', 'info');
        break;
      }
      case 'confetti': {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        showToast('🎉 Đã bắn pháo giấy!', 'success');
        break;
      }
      default:
        setDuration(duration + 5);
        showToast('Đã mở rộng thêm thời lượng video!', 'info');
        break;
    }
  };

  // Main Command Handler (Keyword Parser or LLM API if key is present)
  const handleExecutePrompt = async (promptText: string) => {
    const projId = await ensureProject();
    addChatMessage(projId, 'user', promptText);
    setIsProcessing(true);

    try {
      // 1. LLM MODE (IF API KEY IS PROVIDED IN SETTINGS)
      if (settings.aiApiKey && settings.aiApiKey.trim().length > 10) {
        const apiKey = settings.aiApiKey.trim();
        let actionsList: Array<{ action: string; value?: any }> = [];

        try {
          if (apiKey.startsWith('AIza')) {
            // Google Gemini Endpoint
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: `You are an AI video editing assistant. The user command is: "${promptText}". Return ONLY a JSON array of editing actions with keys "action" and optional "value". Supported actions: "trim" (value: seconds), "speed" (value: number), "text" (value: string), "filter" (value: "cinematic"|"vhs"|"warm"), "mute", "unmute", "export", "confetti". Return strictly JSON without markdown formatting.`
                        }
                      ]
                    }
                  ]
                })
              }
            );
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            actionsList = JSON.parse(cleanJson);
          } else {
            // OpenAI Endpoint
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                  {
                    role: 'system',
                    content: 'You are an AI video editor. Return ONLY a valid JSON array of actions: [{"action": "trim|speed|text|filter|mute|unmute|export|confetti", "value": ...}]'
                  },
                  { role: 'user', content: promptText }
                ]
              })
            });
            const data = await res.json();
            const rawText = data?.choices?.[0]?.message?.content || '[]';
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            actionsList = JSON.parse(cleanJson);
          }

          if (Array.isArray(actionsList) && actionsList.length > 0) {
            for (const item of actionsList) {
              executeAction(item.action, item.value);
            }
            addChatMessage(
              projId,
              'assistant',
              `✅ LLM đã phân tích và thực thi ${actionsList.length} thao tác cho lệnh: "${promptText}".`
            );
            setIsProcessing(false);
            setInput('');
            return;
          }
        } catch (llmErr) {
          console.warn('LLM call error, falling back to keyword parser:', llmErr);
        }
      }

      // 2. CHẾ ĐỘ MẶC ĐỊNH (KEYWORD PARSER THEO TỪ KHÓA VIỆT / ANH)
      setTimeout(() => {
        const lower = promptText.toLowerCase().trim();

        if (lower.includes('cắt') || lower.includes('trim')) {
          const match = lower.match(/\d+/);
          const secs = match ? parseInt(match[0], 10) : 5;
          executeAction('trim', secs);
          addChatMessage(projId, 'assistant', `✅ Đã thực thi cắt ${secs} giây đầu của video theo yêu cầu.`);
        } else if (lower.includes('tăng tốc') || lower.includes('speed') || lower.includes('nhanh')) {
          const match = lower.match(/(\d+(\.\d+)?)/);
          const spd = match ? parseFloat(match[0]) : 2;
          executeAction('speed', spd);
          addChatMessage(projId, 'assistant', `✅ Đã tăng tốc độ video lên ${spd}x.`);
        } else if (lower.includes('thêm chữ') || lower.includes('add text') || lower.includes('chèn chữ')) {
          const content = promptText.replace(/thêm chữ|add text|chèn chữ/gi, '').trim() || 'Xin chào';
          executeAction('text', content);
          addChatMessage(projId, 'assistant', `✅ Đã chèn chữ "${content}" vào timeline.`);
        } else if (lower.includes('làm sáng') || lower.includes('bright') || lower.includes('cinematic') || lower.includes('màu')) {
          executeAction('filter', 'cinematic');
          addChatMessage(projId, 'assistant', '✅ Đã làm sáng video và áp dụng bộ lọc Cinematic.');
        } else if (lower.includes('tắt tiếng') || lower.includes('mute') || lower.includes('im lặng')) {
          executeAction('mute');
          addChatMessage(projId, 'assistant', '✅ Đã tắt tiếng video.');
        } else if (lower.includes('bật tiếng') || lower.includes('unmute')) {
          executeAction('unmute');
          addChatMessage(projId, 'assistant', '✅ Đã bật lại âm thanh.');
        } else if (lower.includes('xuất') || lower.includes('export') || lower.includes('tải về')) {
          executeAction('export');
          addChatMessage(projId, 'assistant', '✅ Đã mở bảng xuất video 9:16.');
        } else if (lower.includes('pháo giấy') || lower.includes('confetti')) {
          executeAction('confetti');
          addChatMessage(projId, 'assistant', '🎉 Đã bắn pháo giấy ăn mừng!');
        } else {
          executeAction('extend');
          addChatMessage(projId, 'assistant', `✅ Đã phân tích kịch bản "${promptText}" và tối ưu bố cục video 9:16.`);
        }

        setIsProcessing(false);
      }, 350);
    } catch (e) {
      setIsProcessing(false);
    }

    setInput('');
  };

  const chips = [
    'Cắt 5 giây đầu',
    'Tăng tốc 2x',
    'Thêm chữ Xin chào',
    'Làm sáng video',
    'Tắt tiếng',
    'Xuất video'
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!editPilotOpen && (
        <button
          onClick={() => setEditPilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/25 hover-lift transition-all"
          title="Mở trợ lý EditPilot AI"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>EditPilot AI</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {editPilotOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-[#111827] border border-[#1F2937] rounded-[16px] shadow-2xl flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="p-3.5 bg-[#0E1320] border-b border-[#1F2937] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#22D3EE] flex items-center justify-center text-slate-950">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#E5E7EB]">EditPilot AI Assistant</span>
                <span className="text-[10px] text-[#9CA3AF]">
                  {settings.aiApiKey ? 'Chế độ: LLM API tích hợp' : 'Chế độ: Keyword Parser thông minh'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditPilotOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[#111827] text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-2.5 text-xs">
            {projectMessages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.role === 'assistant'
                    ? 'bg-[#0B0F19] border border-[#1F2937] text-[#E5E7EB] self-start'
                    : 'bg-[#22D3EE] text-slate-950 font-semibold self-end'
                }`}
              >
                {m.text}
              </div>
            ))}
            {isProcessing && (
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-[#22D3EE] text-xs self-start flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 animate-spin" />
                <span>EditPilot đang phân tích và thực thi lệnh...</span>
              </div>
            )}
          </div>

          {/* Quick Gợi Ý Chips */}
          <div className="px-3.5 py-2 border-t border-[#1F2937] bg-[#0E1320] flex flex-col gap-1.5">
            <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider">Lệnh gợi ý nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleExecutePrompt(chip)}
                  className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-[#22D3EE] text-[10px] font-semibold border border-[#1F2937] hover-lift transition-all"
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
            className="p-3 bg-[#0B0F19] border-t border-[#1F2937] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="VD: cắt 5 giây đầu, tăng tốc 2x, thêm chữ Xin chào..."
              className="flex-1 bg-[#111827] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isProcessing}
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
