import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  X,
  Check,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import {
  searchLocalRegistry,
  installPackage,
  reconnectGhostReferences,
} from '../utils/extensionRegistryManager';

export const MissingAssetsModal: React.FC = () => {
  const { closeModal, showToast, clips, setClips } = useEditorStore();
  const [isResolving, setIsResolving] = useState(false);

  // Collect all clips with ghost references or missing placeholders
  const ghostClips = clips.filter((c: any) => c.ghostRef || c.isGhostPlaceholder);

  // Group unique missing asset IDs
  const missingAssetMap = new Map<string, { id: string; name?: string; kind: string; count: number }>();
  for (const c of ghostClips as any[]) {
    const id = c.ghostRef?.originalId || c.dynamicEffectId || c.name || 'unknown';
    const existing = missingAssetMap.get(id);
    if (existing) {
      existing.count++;
    } else {
      missingAssetMap.set(id, {
        id,
        name: c.name || id,
        kind: c.ghostRef?.kind || c.track || 'effect',
        count: 1,
      });
    }
  }

  const missingList = Array.from(missingAssetMap.values());

  const handleInstallAllFromRegistry = async () => {
    setIsResolving(true);
    let installedCount = 0;
    let totalReconnected = 0;
    let currentClips = [...clips];

    try {
      for (const item of missingList) {
        const results = await searchLocalRegistry(item.id);
        const match = results.find((r) => r.id === item.id || r.name.toLowerCase().includes(item.id.toLowerCase()));
        if (match && !match.isInstalled) {
          const res = await installPackage(match);
          if (res.success) {
            installedCount++;
            const { reconnectedCount, updatedClips } = reconnectGhostReferences(currentClips, match.id, match.spec);
            currentClips = updatedClips;
            totalReconnected += reconnectedCount;
          }
        }
      }

      setClips(currentClips);
      if (installedCount > 0) {
        showToast(`Đã tự động tải ${installedCount} gói tài nguyên và khôi phục ${totalReconnected} clip!`, 'success');
        closeModal();
      } else {
        showToast('Một số tài nguyên chưa có sẵn trong kho cục bộ. Dự án vẫn giữ vị trí an toàn.', 'warning');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message}`, 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const handleUseFallbacks = () => {
    const updatedClips = clips.map((c: any) => {
      if (c.ghostRef) {
        return {
          ...c,
          isGhostPlaceholder: false,
          effectType: 'blur', // Safe basic built-in fallback
        };
      }
      return c;
    });
    setClips(updatedClips);
    showToast('Đã chuyển đổi sang bản thay thế gần đúng cơ bản!', 'info');
    closeModal();
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Phát Hiện Tài Nguyên Chưa Được Cài Đặt</h2>
            <p className="text-xs text-slate-400">
              Dự án tham chiếu các hiệu ứng/chuyển cảnh không có trên máy này.
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
        <div>
          <strong>Bảo Toàn Dự Án:</strong> Timeline không bị hỏng và không bị xóa clip. Khung hình hiện hiển thị
          placeholder giữ chỗ (Ghost Reference). Bạn có thể tải lại gói hoặc dùng bản thay thế bên dưới.
        </div>
      </div>

      {/* Missing Items List */}
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {missingList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Không còn tài nguyên nào bị thiếu!
          </div>
        ) : (
          missingList.map((item) => (
            <div
              key={item.id}
              className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>{item.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                    {item.kind}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-amber-400/80 mt-0.5">
                  ID: {item.id} • {item.count} vị trí trên timeline
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-medium rounded-full border border-amber-500/30">
                Ghost Ref
              </span>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2 text-xs">
        <button
          onClick={closeModal}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
        >
          Giữ Ghost Reference
        </button>

        <button
          onClick={handleUseFallbacks}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
        >
          Dùng bản thay thế gần đúng
        </button>

        <button
          onClick={handleInstallAllFromRegistry}
          disabled={isResolving || missingList.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {isResolving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>Tìm & Tải tất cả từ Kho</span>
        </button>
      </div>
    </div>
  );
};
