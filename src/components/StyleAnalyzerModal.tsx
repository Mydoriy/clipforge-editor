import React, { useState } from 'react';
import {
  Wand2,
  X,
  Sparkles,
  Search,
  Layers,
  Bot,
  Zap,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import {
  analyzeReferenceStyle,
  resolveAnalyzedStyleElement,
  type StyleAnalysisReport,
  type StyleElementAnalysis,
} from '../engine/styleAnalyzer';

export const StyleAnalyzerModal: React.FC = () => {
  const { closeModal, showToast, clips, selectedClipId, updateClip, addClip, currentTime } = useEditorStore();
  const [report, setReport] = useState<StyleAnalysisReport>(() =>
    analyzeReferenceStyle([], ['filter.cinematic'])
  );
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolveAction = async (
    element: StyleElementAnalysis,
    action: 'search_registry' | 'synthesize_composite' | 'ai_generate' | 'use_nearest'
  ) => {
    setResolvingId(`${element.id}_${action}`);
    try {
      const res = await resolveAnalyzedStyleElement(
        element,
        action,
        report.referenceFrames || []
      );

      if (res.action === 'apply_directly' && res.item) {
        // Apply directly to selected or new clip
        if (selectedClipId) {
          updateClip(selectedClipId, {
            dynamicSpec: res.item as any,
            dynamicEffectId: res.item.id,
          });
        } else {
          addClip({
            track: element.kind === 'filter' ? 'filter' : 'effect',
            name: element.name,
            start: currentTime,
            duration: 5,
            type: element.kind as any,
            dynamicSpec: res.item as any,
            dynamicEffectId: res.item.id,
          } as any);
        }
        showToast(`Đã áp dụng "${element.name}" (Bậc ${res.tier} - ${res.reason})`, 'success');
      } else if (res.action === 'apply_composite') {
        showToast(`Đã ghép hiệu ứng cục bộ từ các khối có sẵn cho "${element.name}"!`, 'success');
      } else if (res.action === 'prompt_install') {
        showToast(`Đã tìm thấy trong kho: "${res.item?.id || element.name}". Gợi ý cài đặt!`, 'info');
      } else if (res.action === 'prompt_ai_generation') {
        showToast('Sẵn sàng để AI tạo shader mới theo phong cách!', 'info');
      } else {
        showToast(res.reason, 'warning');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message}`, 'error');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Sao Chép Phong Cách (Style Analyzer)</h2>
            <p className="text-xs text-slate-400">
              Trích xuất phong cách video mẫu, đối chiếu kho và giải quyết qua thang Resolver.
            </p>
          </div>
        </div>
        <button
          onClick={closeModal}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Analysis Elements Breakdown */}
      <div className="space-y-3">
        {report.elements.map((el) => {
          const isUnsupported = el.status === 'unsupported';
          const isLowConfidence = el.status === 'low_confidence';
          const needsResolution = isUnsupported || isLowConfidence;

          return (
            <div
              key={el.id}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">{el.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {el.kind}
                  </span>
                </div>

                {el.status === 'supported' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Đã hỗ trợ
                  </span>
                ) : isLowConfidence ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <AlertCircle className="w-3 h-3" /> Gần đúng điểm thấp ({Math.round(el.confidenceScore * 100)}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                    <HelpCircle className="w-3 h-3" /> Chưa hỗ trợ
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">{el.detectedDescription}</p>

              {/* 4 Resolution Trigger Buttons when unsupported or low confidence */}
              {needsResolution && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleResolveAction(el, 'search_registry')}
                    disabled={resolvingId === `${el.id}_search_registry`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg transition-colors font-medium text-[11px]"
                    title="Tìm gói tương thích trong chỉ mục kho cục bộ (Tier 3)"
                  >
                    <Search className="w-3 h-3" />
                    <span>Tìm trong kho</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction(el, 'synthesize_composite')}
                    disabled={resolvingId === `${el.id}_synthesize_composite`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/30 rounded-lg transition-colors font-medium text-[11px]"
                    title="Ghép từ các khối hiệu ứng cơ bản có sẵn (Tier 4)"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Ghép từ hiệu ứng có sẵn</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction(el, 'ai_generate')}
                    disabled={resolvingId === `${el.id}_ai_generate`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-pink-400 border border-pink-500/30 rounded-lg transition-colors font-medium text-[11px]"
                    title="Nhờ AI viết shader mới (Yêu cầu API key + đồng ý - Tier 5)"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Nhờ AI viết (nếu có key)</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction(el, 'use_nearest')}
                    disabled={resolvingId === `${el.id}_use_nearest`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg transition-colors font-medium text-[11px]"
                    title="Dùng hiệu ứng gần nhất trong máy (Tier 2)"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Dùng gần nhất</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
