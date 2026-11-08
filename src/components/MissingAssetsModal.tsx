import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  X,
  Check,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import {
  searchLocalRegistry,
  installPackage,
  reconnectGhostReferences,
  type SearchResultItem,
} from '../utils/extensionRegistryManager';
import { synthesizeGraphFromQuery } from '../engine/localCompositeSynthesizer';
import type { AssetKind } from '../types/extensionRegistry';

export type MissingItemProposal = 'in_registry' | 'can_synthesize' | 'has_fallback' | 'skip';

export interface MissingItemInfo {
  id: string;
  name: string;
  kind: AssetKind;
  count: number;
  proposal: MissingItemProposal;
  registryMatch?: SearchResultItem;
  compositeSpec?: any;
  status: 'pending' | 'resolving' | 'resolved' | 'skipped';
}

export const MissingAssetsModal: React.FC = () => {
  const { closeModal, showToast, clips, setClips } = useEditorStore();
  const [items, setItems] = useState<MissingItemInfo[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  // Scan ghost clips on timeline
  useEffect(() => {
    let isMounted = true;

    async function evaluateMissingItems() {
      setIsLoadingProposals(true);
      const ghostClips = clips.filter((c: any) => c.ghostRef || c.isGhostPlaceholder);
      const map = new Map<string, { id: string; name: string; kind: AssetKind; count: number }>();

      for (const c of ghostClips as any[]) {
        const id = c.ghostRef?.originalId || c.dynamicEffectId || c.name || 'unknown';
        const existing = map.get(id);
        if (existing) {
          existing.count++;
        } else {
          map.set(id, {
            id,
            name: c.ghostRef?.name || c.name || id,
            kind: (c.ghostRef?.kind || c.track || 'effect') as AssetKind,
            count: 1,
          });
        }
      }

      const list: MissingItemInfo[] = [];

      for (const raw of Array.from(map.values())) {
        // 1. Check Registry Index
        const results = await searchLocalRegistry(raw.id).catch(() => []);
        const regMatch = results.find(
          (r) => r.id === raw.id || r.name.toLowerCase().includes(raw.name.toLowerCase())
        );

        if (regMatch) {
          list.push({
            ...raw,
            proposal: 'in_registry',
            registryMatch: regMatch,
            status: 'pending',
          });
          continue;
        }

        // 2. Check Local M5 Composite Synthesizer
        const comp = synthesizeGraphFromQuery(raw.name || raw.id, raw.kind as any);
        if (comp) {
          list.push({
            ...raw,
            proposal: 'can_synthesize',
            compositeSpec: comp,
            status: 'pending',
          });
          continue;
        }

        // 3. Fallback
        list.push({
          ...raw,
          proposal: 'has_fallback',
          status: 'pending',
        });
      }

      if (isMounted) {
        setItems(list);
        setIsLoadingProposals(false);
      }
    }

    evaluateMissingItems();

    return () => {
      isMounted = false;
    };
  }, [clips]);

  // Resolve single item
  const handleResolveItem = async (item: MissingItemInfo, choice: MissingItemProposal) => {
    let currentClips = [...clips];

    if (choice === 'in_registry' && item.registryMatch) {
      const res = await installPackage(item.registryMatch);
      if (res.success) {
        const { updatedClips } = reconnectGhostReferences(
          currentClips,
          item.registryMatch.id,
          item.registryMatch.spec
        );
        currentClips = updatedClips;
      }
    } else if (choice === 'can_synthesize' && item.compositeSpec) {
      currentClips = currentClips.map((c: any) => {
        const refId = c.dynamicEffectId || c.ghostRef?.originalId;
        if (refId === item.id) {
          const { ghostRef, ...rest } = c;
          return {
            ...rest,
            dynamicSpec: item.compositeSpec,
            isGhostPlaceholder: false,
            ghostReason: undefined,
          };
        }
        return c;
      });
    } else if (choice === 'has_fallback') {
      currentClips = currentClips.map((c: any) => {
        const refId = c.dynamicEffectId || c.ghostRef?.originalId;
        if (refId === item.id) {
          return {
            ...c,
            isGhostPlaceholder: false,
            effectType: 'blur', // safe fallback
            ghostReason: undefined,
          };
        }
        return c;
      });
    }

    setClips(currentClips);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: choice === 'skip' ? 'skipped' : 'resolved' } : i))
    );
    showToast(`Đã cập nhật trạng thái cho "${item.name}"!`, 'info');
  };

  // Resolve All automatically
  const handleResolveAll = async () => {
    setIsResolvingAll(true);
    let currentClips = [...clips];
    let resolvedCount = 0;

    try {
      for (const item of items) {
        if (item.status === 'resolved') continue;

        if (item.proposal === 'in_registry' && item.registryMatch) {
          const res = await installPackage(item.registryMatch);
          if (res.success) {
            const { updatedClips } = reconnectGhostReferences(
              currentClips,
              item.registryMatch.id,
              item.registryMatch.spec
            );
            currentClips = updatedClips;
            resolvedCount++;
          }
        } else if (item.proposal === 'can_synthesize' && item.compositeSpec) {
          currentClips = currentClips.map((c: any) => {
            const refId = c.dynamicEffectId || c.ghostRef?.originalId;
            if (refId === item.id) {
              const { ghostRef, ...rest } = c;
              return {
                ...rest,
                dynamicSpec: item.compositeSpec,
                isGhostPlaceholder: false,
                ghostReason: undefined,
              };
            }
            return c;
          });
          resolvedCount++;
        } else {
          // fallback
          currentClips = currentClips.map((c: any) => {
            const refId = c.dynamicEffectId || c.ghostRef?.originalId;
            if (refId === item.id) {
              return {
                ...c,
                isGhostPlaceholder: false,
                effectType: 'blur',
                ghostReason: undefined,
              };
            }
            return c;
          });
          resolvedCount++;
        }
      }

      setClips(currentClips);
      showToast(`Đã giải quyết thành công ${resolvedCount} tài nguyên thiếu!`, 'success');
      closeModal();
    } catch (err: any) {
      showToast(`Lỗi giải quyết tài nguyên: ${err?.message}`, 'error');
    } finally {
      setIsResolvingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Phát Hiện Tài Nguyên Chưa Được Cài Đặt</h2>
            <p className="text-xs text-slate-400">
              Dự án tham chiếu các hiệu ứng/chuyển cảnh không có trên thiết bị này.
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

      {/* Preservation Guarantee Note */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Bảo Toàn Cấu Trúc Dự Án:</strong> Timeline không bị xóa clip. Khung hình hiện hiển thị vị trí giữ chỗ
          (Ghost Reference). Bạn có thể tải lại gói từ Kho, ghép từ hiệu ứng cơ bản, hoặc dùng bản thay thế bên dưới.
        </div>
      </div>

      {/* Missing Items Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 max-h-72 overflow-y-auto">
        {isLoadingProposals ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Đang tra cứu Kho tài nguyên và phân tích đề xuất giải quyết...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span className="font-semibold text-slate-300">Dự án hoàn toàn đầy đủ tài nguyên!</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {items.map((item) => (
              <div key={item.id} className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="truncate">{item.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {item.kind}
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      ({item.count} vị trí)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    ID: {item.id}
                  </div>
                </div>

                {/* Proposed Status Badge & Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'resolved' ? (
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Đã giải quyết
                    </span>
                  ) : item.status === 'skipped' ? (
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
                      Đã bỏ qua (Ghost)
                    </span>
                  ) : (
                    <>
                      {item.proposal === 'in_registry' && (
                        <button
                          onClick={() => handleResolveItem(item, 'in_registry')}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Cài đặt gói chính thức từ Kho tài nguyên"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>Có trong kho • Cài đặt</span>
                        </button>
                      )}

                      {item.proposal === 'can_synthesize' && (
                        <button
                          onClick={() => handleResolveItem(item, 'can_synthesize')}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Ghép tất định từ các khối primitive có sẵn"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Ghép được • Tạo ngay</span>
                        </button>
                      )}

                      {item.proposal === 'has_fallback' && (
                        <button
                          onClick={() => handleResolveItem(item, 'has_fallback')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Sử dụng hiệu ứng cơ bản gần đúng"
                        >
                          <Sliders className="w-3 h-3 text-amber-400" />
                          <span>Dùng thay thế</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleResolveItem(item, 'skip')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
                        title="Giữ khung giữ chỗ Ghost Reference"
                      >
                        Bỏ qua
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <span className="text-slate-400 text-[11px]">
          * Lưu ý: Khi xuất video, clip còn giữ Ghost Reference sẽ hiển thị cảnh báo xác nhận.
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <button
            onClick={closeModal}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
          >
            Giữ Ghost Reference
          </button>

          <button
            onClick={() => {
              const updated = clips.map((c: any) => {
                if (c.ghostRef) {
                  return { ...c, isGhostPlaceholder: false, effectType: 'blur' };
                }
                return c;
              });
              setClips(updated);
              showToast('Đã chuyển đổi sang bản thay thế gần đúng!', 'info');
              closeModal();
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Dùng bản thay thế gần đúng
          </button>

          <button
            onClick={handleResolveAll}
            disabled={isResolvingAll || items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tìm & Tải tất cả từ Kho</span>
          </button>

          <button
            onClick={handleResolveAll}
            disabled={isResolvingAll || items.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {isResolvingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Giải quyết tất cả</span>
          </button>
        </div>
      </div>
    </div>
  );
};
