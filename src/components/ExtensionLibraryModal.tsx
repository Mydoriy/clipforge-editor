import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Download,
  Upload,
  Check,
  ShieldCheck,
  Globe,
  Sparkles,
  Trash2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Settings,
  ShieldAlert,
  Cpu,
  Eye,
  CheckCircle2,
  HardDrive,
  Info,
  Radio,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import {
  generateEffectWithAI,
  saveAiEffectToMyEffects,
  AI_PRIVACY_WARNING,
  AI_UNVERIFIED_LABEL_VI,
  type AiEffectResponse,
} from '../engine/aiEffectSynthesizer';
import {
  generateDiagnosticInfo,
  copyDiagnosticInfoToClipboard,
} from '../engine/securitySandbox';
import {
  searchLocalRegistry,
  installPackage,
  uninstallPackage,
  importPackageFromFile,
  exportPackageToFile,
  reconnectGhostReferences,
  fetchOrLoadRegistryIndex,
  checkAndApplyRevocations,
  getRegistryUrl,
  setCustomRegistryUrl,
  resetRegistryUrl,
  checkUninstallSafety,
  safeUninstallPackage,
  getAutoUpdateOfficialPatchesSetting,
  setAutoUpdateOfficialPatchesSetting,
  compareEffectVersions,
  getInstalledAssets,
  DEFAULT_REGISTRY_URL,
  getRegistryConsent,
  setRegistryConsent,
  getOfflineOnlyMode,
  setOfflineOnlyMode,
  getOnlyOfficialMode,
  setOnlyOfficialMode,
  getExtensionStorageQuota,
  setExtensionStorageQuota,
  getExtensionStorageStats,
  runSafeLruEviction,
  wipeAllExtensionLibrary,
  type SearchResultItem,
} from '../utils/extensionRegistryManager';
import type { AssetKind, TrustLevel, StorageQuotaConfig } from '../types/extensionRegistry';
import type { InstalledAssetEntity } from '../db';

interface ExtensionLibraryModalProps {
  initialKind?: AssetKind;
}

export type MainStoreTab = 'explore' | 'installed' | 'updates' | 'my_assets' | 'settings';

export const ExtensionLibraryModal: React.FC<ExtensionLibraryModalProps> = ({ initialKind }) => {
  const { closeModal, showToast, clips, setClips, selectedClipId } = useEditorStore();

  // Navigation & Filter States
  const [activeMainTab, setActiveMainTab] = useState<MainStoreTab>('explore');
  const [query, setQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<AssetKind | 'all'>(initialKind || 'all');
  const [selectedTrust, setSelectedTrust] = useState<TrustLevel | 'all'>('all');
  const [selectedLicense, setSelectedLicense] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<'all' | 'small' | 'medium' | 'large'>('all');

  // Data & Progress States
  const [packages, setPackages] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<
    Record<string, { percent: number; stage: string; controller: AbortController }>
  >({});
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Settings & Storage States
  const [customRegistryInput, setCustomRegistryInput] = useState(getRegistryUrl());
  const [revokedAssets, setRevokedAssets] = useState<InstalledAssetEntity[]>([]);
  const [autoUpdatePatches, setAutoUpdatePatches] = useState(getAutoUpdateOfficialPatchesSetting());
  const [registryConsent, setConsentState] = useState(getRegistryConsent());
  const [offlineOnly, setOfflineOnlyState] = useState(getOfflineOnlyMode());
  const [onlyOfficial, setOnlyOfficialState] = useState(getOnlyOfficialMode());
  const [storageQuota, setStorageQuotaState] = useState(getExtensionStorageQuota());
  const [storageStats, setStorageStats] = useState<StorageQuotaConfig | null>(null);
  const [diffModalInfo, setDiffModalInfo] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // M6: AI Effect & Shader Synthesis States (Default OFF & Privacy Guarded)
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('clipforge_ai_key') || '');
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini' | 'mock'>('mock');
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem('clipforge_ai_enabled') === 'true');
  const [aiConsented, setAiConsented] = useState(() => localStorage.getItem('clipforge_ai_consented') === 'true');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiIncludeFrames, setAiIncludeFrames] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState('');
  const [aiResult, setAiResult] = useState<AiEffectResponse | null>(null);
  const [aiParamValues, setAiParamValues] = useState<Record<string, any>>({});
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [lastErrorDiagnostic, setLastErrorDiagnostic] = useState<{
    packId?: string;
    version?: string;
    sha256?: string;
    message: string;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadData = async (forceOnline = false) => {
    setIsLoading(true);
    try {
      if (forceOnline && !offlineOnly) {
        await fetchOrLoadRegistryIndex(true);
      }
      const results = await searchLocalRegistry(
        query,
        selectedKind === 'all' ? undefined : selectedKind,
        selectedTrust === 'all' ? undefined : selectedTrust
      );
      setPackages(results);

      // Check revocations
      const revResult = await checkAndApplyRevocations();
      setRevokedAssets(revResult.revokedAssets || []);

      // Storage stats
      const stats = await getExtensionStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error(err);
      showToast('Không thể nạp danh sách tài nguyên cục bộ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query, selectedKind, selectedTrust, offlineOnly]);

  // Install with Real Progress & Cancelable AbortSignal
  const handleInstallWithProgress = async (pkg: SearchResultItem) => {
    const controller = new AbortController();
    setInstallProgress((prev) => ({
      ...prev,
      [pkg.id]: { percent: 10, stage: 'Bắt đầu kiểm tra gói...', controller },
    }));
    setInstallingId(pkg.id);

    try {
      const res = await installPackage(pkg, {
        signal: controller.signal,
        onProgress: (percent, stage) => {
          setInstallProgress((prev) => ({
            ...prev,
            [pkg.id]: { percent, stage, controller },
          }));
        },
      });

      if (!res.success) {
        setLastErrorDiagnostic({
          packId: pkg.id,
          version: pkg.version,
          sha256: pkg.sha256,
          message: res.error || 'Cài đặt thất bại',
        });
        showToast(res.error || 'Cài đặt thất bại', 'error');
        return;
      }

      setLastErrorDiagnostic(null);
      const { reconnectedCount, updatedClips } = reconnectGhostReferences(clips, pkg.id, pkg.spec);
      if (reconnectedCount > 0) {
        setClips(updatedClips);
        showToast(`Đã cài đặt "${pkg.name}" và tự động phục hồi ${reconnectedCount} vị trí trên timeline!`, 'success');
      } else {
        showToast(`Đã cài đặt "${pkg.name}" vào máy thành công!`, 'success');
      }

      await loadData();
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message || 'Không thể cài đặt'}`, 'error');
    } finally {
      setInstallingId(null);
      setTimeout(() => {
        setInstallProgress((prev) => {
          const next = { ...prev };
          delete next[pkg.id];
          return next;
        });
      }, 1000);
    }
  };

  const handleCancelInstall = (pkgId: string) => {
    if (installProgress[pkgId]?.controller) {
      installProgress[pkgId].controller.abort();
      setInstallProgress((prev) => {
        const next = { ...prev };
        delete next[pkgId];
        return next;
      });
      setInstallingId(null);
      showToast('Đã hủy cài đặt gói!', 'info');
    }
  };

  // Try / Preview Effect directly on active clip
  const handleTryEffect = (pkg: SearchResultItem) => {
    const targetClip = clips.find((c: any) => c.id === selectedClipId) || clips[0];
    if (!targetClip) {
      showToast('Vui lòng thêm hoặc chọn 1 clip trên timeline để dùng thử!', 'info');
      return;
    }
    const updated = clips.map((c: any) => {
      if (c.id === targetClip.id) {
        return {
          ...c,
          dynamicSpec: pkg.spec,
          isTrial: true,
        };
      }
      return c;
    });
    setClips(updated);
    showToast(`Đang dùng thử "${pkg.name}" trên clip "${targetClip.name || targetClip.id}"!`, 'success');
  };

  // Report Error / Copy Diagnostics
  const handleReportError = (pkg: SearchResultItem) => {
    const diag = generateDiagnosticInfo('ERR_SANDBOX_TIMEOUT', {
      packId: pkg.id,
      version: pkg.version,
      sha256: pkg.hash || pkg.sha256,
      message: `Báo lỗi thủ công cho tài nguyên "${pkg.name}"`,
    });
    copyDiagnosticInfoToClipboard(diag);
    showToast(`Đã sao chép báo cáo chẩn đoán của "${pkg.name}" vào Clipboard!`, 'info');
  };

  // Safe Uninstall
  const handleUninstall = async (id: string, name: string) => {
    try {
      const safety = await checkUninstallSafety(id);
      if (safety.affectedProjects.length > 0) {
        const projNames = safety.affectedProjects.map((p) => `"${p.title}"`).join(', ');
        const confirmed = window.confirm(
          `Hiệu ứng "${name}" đang được sử dụng trong ${safety.affectedProjects.length} dự án (${projNames}).\n\nSau khi gỡ, các khung hình trong các dự án trên sẽ chuyển sang Ghost Reference an toàn.\n\nBạn có chắc chắn muốn gỡ cài đặt không?`
        );
        if (!confirmed) return;
      }
      const res = await safeUninstallPackage(id);
      showToast(`Đã gỡ bỏ "${name}" khỏi thiết bị!`, 'info');
      await loadData();
    } catch (err: any) {
      showToast(`Lỗi gỡ bỏ: ${err?.message}`, 'error');
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importPackageFromFile(file);
    if (!res.success || !res.pkg) {
      setLastErrorDiagnostic({
        packId: file.name,
        message: res.error || 'Tệp không hợp lệ hoặc chứa mã độc!',
      });
      showToast(res.error || 'Tệp không hợp lệ hoặc chứa mã độc!', 'error');
      return;
    }
    setLastErrorDiagnostic(null);

    const { reconnectedCount, updatedClips } = reconnectGhostReferences(clips, res.pkg.id, res.pkg.spec);
    if (reconnectedCount > 0) {
      setClips(updatedClips);
      showToast(`Đã nhập "${res.pkg.name}" và phục hồi ${reconnectedCount} vị trí trên timeline!`, 'success');
    } else {
      showToast(`Đã nhập và cài đặt thành công "${res.pkg.name}"!`, 'success');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadData();
  };

  // Wipe All Extensions (Factory Reset)
  const handleWipeAll = async () => {
    const confirmed = window.confirm(
      'CẢNH BÁO NGUY HIỂM: Hành động này sẽ XÓA SẠCH toàn bộ hiệu ứng, chuyển cảnh, bộ lọc đã cài đặt khỏi máy và đặt lại Cache Storage.\n\nCác project đang dùng sẽ tự chuyển sang Ghost Reference an toàn.\n\nBạn có chắc chắn muốn tiếp tục không?'
    );
    if (!confirmed) return;

    const res = await wipeAllExtensionLibrary();
    showToast(`Đã xóa sạch ${res.clearedCount} tài nguyên mở rộng trên thiết bị!`, 'info');
    await loadData();
  };

  // Run LRU Eviction
  const handleRunLru = async () => {
    const res = await runSafeLruEviction();
    showToast(
      `Dọn dẹp LRU hoàn tất: Giải phóng ${formatBytes(res.freedBytes)} (${res.protectedPackages.length} gói đang dùng được bảo vệ tuyệt đối).`,
      'success'
    );
    await loadData();
  };

  // Render Trust Badge
  const renderTrustBadge = (trust: TrustLevel) => {
    switch (trust) {
      case 'official':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Chính thức (Official)
          </span>
        );
      case 'community':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Globe className="w-3 h-3" /> Cộng đồng
          </span>
        );
      case 'local_fallback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3" /> Ghép cục bộ
          </span>
        );
      case 'ai_generated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Cpu className="w-3 h-3 text-amber-400" /> Do AI tạo – chưa kiểm duyệt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Nhập thủ công
          </span>
        );
    }
  };

  // Filter packages based on activeMainTab and filter dropdowns
  const filteredPackages = packages.filter((pkg) => {
    if (activeMainTab === 'installed' && !pkg.isInstalled) return false;
    if (activeMainTab === 'updates' && !pkg.hasUpdate) return false;
    if (activeMainTab === 'my_assets') {
      const isMine =
        pkg.trustLevel === 'local_fallback' ||
        pkg.trustLevel === 'ai_generated' ||
        pkg.trustLevel === 'manual';
      if (!isMine) return false;
    }

    if (selectedKind !== 'all' && pkg.kind !== selectedKind) return false;
    if (selectedTrust !== 'all' && pkg.trustLevel !== selectedTrust) return false;

    if (selectedLicense !== 'all') {
      if (!pkg.license.toLowerCase().includes(selectedLicense.toLowerCase())) return false;
    }

    if (selectedSize === 'small' && (pkg.sizeBytes || 0) >= 1024 * 1024) return false;
    if (
      selectedSize === 'medium' &&
      ((pkg.sizeBytes || 0) < 1024 * 1024 || (pkg.sizeBytes || 0) > 10 * 1024 * 1024)
    )
      return false;
    if (selectedSize === 'large' && (pkg.sizeBytes || 0) <= 10 * 1024 * 1024) return false;

    return true;
  });

  const ghostClips = clips.filter((c: any) => c.ghostRef || c.isGhostPlaceholder);

  return (
    <div className="flex flex-col h-[85vh] text-slate-100 max-w-4xl">
      {/* Hidden File Input for Manual Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pkg.json,.json,.cube,.capfx"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <Globe className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Kho Hiệu Ứng Mở Rộng (Extension Store)</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                OFFLINE-FIRST
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Khám phá, cài đặt hiệu ứng WebGL, chuyển cảnh, bộ lọc 3D LUT mà không cần deploy lại ứng dụng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsCheckingUpdates(true);
              try {
                const idx = await fetchOrLoadRegistryIndex(true);
                const revRes = await checkAndApplyRevocations(idx, clips);
                if (revRes.updatedClips) {
                  setClips(revRes.updatedClips);
                }
                setRevokedAssets(revRes.revokedAssets || []);
                await loadData();
                showToast(`Đã đồng bộ chỉ mục kho thành công (${idx.packages.length} gói)!`, 'success');
              } catch (err: any) {
                showToast(`Đang hoạt động ngoại tuyến: sử dụng chỉ mục đã lưu trong máy.`, 'info');
              } finally {
                setIsCheckingUpdates(false);
              }
            }}
            disabled={isCheckingUpdates}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Kiểm tra phiên bản mới và đồng bộ lại danh mục"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            <span>Kiểm tra ngay</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Nhập gói mở rộng .capfx, .pkg.json hoặc 3D LUT .cube"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập gói</span>
          </button>

          <button
            onClick={closeModal}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Offline Status Banner */}
      {offlineOnly && (
        <div className="mt-2.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>
            <strong>Chế độ Chỉ Offline:</strong> Không kết nối máy chủ ngoài. Bạn có thể sử dụng trọn vẹn toàn bộ tài nguyên đã cài sẵn.
          </span>
        </div>
      )}

      {/* 5 Main Navigation Tabs */}
      <div className="flex items-center gap-1 mt-3 border-b border-slate-800 pb-2 text-xs font-semibold">
        {[
          { id: 'explore', label: 'Khám phá', icon: Globe },
          { id: 'installed', label: `Đã cài (${packages.filter((p) => p.isInstalled).length})`, icon: Check },
          { id: 'updates', label: `Cập nhật (${packages.filter((p) => p.hasUpdate).length})`, icon: RefreshCw },
          { id: 'my_assets', label: 'Của tôi', icon: Sparkles },
          { id: 'settings', label: 'Cài đặt', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id as MainStoreTab)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 5: SETTINGS */}
      {activeMainTab === 'settings' ? (
        <div className="flex-1 overflow-y-auto mt-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Cài Đặt Kho Tài Nguyên & Quyền Riêng Tư
          </h3>

          {/* First Use Consent & Offline Mode */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-semibold">
              <input
                type="checkbox"
                checked={registryConsent}
                onChange={(e) => {
                  setConsentState(e.target.checked);
                  setRegistryConsent(e.target.checked);
                }}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
              />
              <span>Đồng ý kết nối Kho trực tuyến (Hỏi ở lần dùng đầu)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-semibold pl-6">
              <input
                type="checkbox"
                checked={offlineOnly}
                onChange={(e) => {
                  setOfflineOnlyState(e.target.checked);
                  setOfflineOnlyMode(e.target.checked);
                  showToast(e.target.checked ? 'Đã bật chế độ Chỉ Offline' : 'Đã tắt chế độ Chỉ Offline', 'info');
                }}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
              />
              <span>Chế độ Chỉ Offline (Không bao giờ gửi yêu cầu HTTP tải index)</span>
            </label>
          </div>

          {/* Custom Registry URL */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col gap-2">
            <label className="font-semibold text-slate-200">Cấu hình Đường dẫn Kho Tùy Chỉnh (Custom Registry URL)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customRegistryInput}
                onChange={(e) => setCustomRegistryInput(e.target.value)}
                placeholder={DEFAULT_REGISTRY_URL}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  setCustomRegistryUrl(customRegistryInput);
                  showToast('Đã lưu địa chỉ kho tùy chỉnh!', 'success');
                  loadData(true);
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Lưu kho
              </button>
              <button
                onClick={() => {
                  resetRegistryUrl();
                  setCustomRegistryInput(DEFAULT_REGISTRY_URL);
                  showToast('Đã đặt lại về Kho chính thức', 'info');
                  loadData(true);
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Mặc định
              </button>
            </div>
          </div>

          {/* Trust Official & Auto Patches */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={onlyOfficial}
                onChange={(e) => {
                  setOnlyOfficialState(e.target.checked);
                  setOnlyOfficialMode(e.target.checked);
                  showToast(e.target.checked ? 'Đã bật: Chỉ tin cậy gói Chính thức' : 'Đã tắt hạn chế', 'info');
                }}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 mt-0.5"
              />
              <div>
                <span className="font-semibold block">Chỉ tin cậy gói Chính thức (Ed25519)</span>
                <span className="text-[11px] text-slate-400">Từ chối cài đặt các gói bên thứ ba chưa ký số</span>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={autoUpdatePatches}
                onChange={(e) => {
                  setAutoUpdatePatches(e.target.checked);
                  setAutoUpdateOfficialPatchesSetting(e.target.checked);
                  showToast(e.target.checked ? 'Đã bật tự cập nhật patch' : 'Đã tắt tự cập nhật patch', 'info');
                }}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 mt-0.5"
              />
              <div>
                <span className="font-semibold block">Tự động cập nhật bản vá (Patch)</span>
                <span className="text-[11px] text-slate-400">Bản minor/major luôn yêu cầu người dùng xác nhận</span>
              </div>
            </label>
          </div>

          {/* Storage Quota & LRU */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Hạn mức dung lượng bộ nhớ kho
              </span>
              <span className="font-mono text-cyan-300">
                {storageStats ? `${formatBytes(storageStats.usedBytes)} / ${formatBytes(storageStats.limitBytes)}` : 'Đang tính...'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={storageQuota}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setStorageQuotaState(val);
                  setExtensionStorageQuota(val);
                  showToast(`Đã đặt hạn mức: ${val} MB`, 'info');
                  loadData();
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value={50}>50 MB</option>
                <option value={100}>100 MB</option>
                <option value={200}>200 MB (Khuyến nghị)</option>
                <option value={500}>500 MB</option>
              </select>

              <button
                onClick={handleRunLru}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dọn dẹp LRU an toàn</span>
              </button>
            </div>
          </div>

          {/* AI Effect Synthesizer Toggle */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                Bật Trợ lý AI Viết Hiệu Ứng (M6)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Mặc định TẮT. Chỉ kích hoạt khi người dùng nhập API key và đồng ý.
              </span>
            </div>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => {
                setAiEnabled(e.target.checked);
                localStorage.setItem('clipforge_ai_enabled', e.target.checked ? 'true' : 'false');
                showToast(e.target.checked ? 'Đã bật công cụ AI' : 'Đã tắt công cụ AI', 'info');
              }}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
            />
          </div>

          {/* Factory Reset / Wipe All Extensions */}
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-rose-300 block">Xóa toàn bộ thư viện mở rộng (Factory Reset)</span>
              <span className="text-[11px] text-rose-400/80 block mt-0.5">
                Xóa tất cả các gói đã tải trong Dexie và Cache Storage. Dự án ghim chuyển sang Ghost an toàn.
              </span>
            </div>
            <button
              onClick={handleWipeAll}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors shadow-md shadow-rose-900/40"
            >
              Xóa sạch toàn bộ
            </button>
          </div>
        </div>
      ) : null}

      {/* TAB 1, 2, 3, 4: EXPLORE, INSTALLED, UPDATES, MY ASSETS */}
      {activeMainTab !== 'settings' && (
        <>
          {/* Search & Advanced Filters */}
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, tag, đồng nghĩa (vd: glitch, rung lắc, flash, vhs)..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            {/* Filter by License */}
            <select
              value={selectedLicense}
              onChange={(e) => setSelectedLicense(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              title="Lọc theo Giấy phép"
            >
              <option value="all">Mọi giấy phép</option>
              <option value="MIT">MIT</option>
              <option value="CC0">CC0-1.0</option>
              <option value="OFL">OFL-1.1</option>
            </select>

            {/* Filter by Trust */}
            <select
              value={selectedTrust}
              onChange={(e) => setSelectedTrust(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              title="Lọc theo Mức tin cậy"
            >
              <option value="all">Mọi mức tin cậy</option>
              <option value="official">Chính thức (Official)</option>
              <option value="community">Cộng đồng</option>
            </select>

            {/* Filter by Size */}
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              title="Lọc theo Kích thước"
            >
              <option value="all">Mọi kích thước</option>
              <option value="small">&lt; 1 MB</option>
              <option value="medium">1 MB - 10 MB</option>
              <option value="large">&gt; 10 MB</option>
            </select>
          </div>

          {/* Kind Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'effect', label: 'Hiệu ứng WebGL' },
              { id: 'transition', label: 'Chuyển cảnh' },
              { id: 'filter', label: 'Bộ lọc & LUT' },
              { id: 'sfx', label: 'Âm thanh SFX' },
              { id: 'sticker', label: 'Nhãn dán SVG' },
              { id: 'template', label: 'Mẫu dự án' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedKind(tab.id as any)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none ${
                  selectedKind === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* My Assets Tab: Quick Actions */}
          {activeMainTab === 'my_assets' && (
            <div className="mt-2.5 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Tài nguyên do bạn sáng tạo (Ghép M5 / AI M6 / Nhập thủ công)
                </span>
                <span className="text-[11px] text-purple-300/80 block mt-0.5">
                  Lưu trữ vĩnh viễn trên thiết bị của bạn. Không cần mạng để sử dụng.
                </span>
              </div>
              <button
                onClick={() => setShowAiModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-lg text-xs transition-colors shadow-md flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Mở AI viết hiệu ứng</span>
              </button>
            </div>
          )}

          {/* Packages List */}
          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
                <p className="text-xs">Đang tìm kiếm kho tài nguyên cục bộ...</p>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Layers className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-300">Không tìm thấy tài nguyên phù hợp</p>
                <p className="text-xs text-slate-500 mt-1">
                  Thử tìm từ khóa khác hoặc nhập tệp .capfx / LUT .cube bằng nút "Nhập gói".
                </p>
              </div>
            ) : (
              filteredPackages.map((pkg) => {
                const prog = installProgress[pkg.id];
                return (
                  <div
                    key={pkg.id}
                    className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Thumbnail / Kind Icon */}
                        <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                          {pkg.kind[0].toUpperCase()}
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 truncate">{pkg.name}</h3>
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                          v{pkg.version}
                        </span>
                        {renderTrustBadge(pkg.trustLevel)}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                          {pkg.license}
                        </span>
                        {pkg.spec?.redistributable === false ? (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded" title="Gói có bản quyền riêng - Không nhúng redistributable vào .capproj">
                            Không phân phối lại
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded" title="Cho phép tự do phân phối lại">
                            Tự do phân phối
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                          {formatBytes(pkg.sizeBytes || 0)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 mb-2">{pkg.description}</p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>
                          Tác giả / Nguồn: <strong className="text-slate-300">{pkg.spec.author}</strong>
                          {pkg.spec.sourceUrl && (
                            <a
                              href={pkg.spec.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1.5 text-cyan-400 hover:underline"
                            >
                              (Nguồn)
                            </a>
                          )}
                        </span>
                        {pkg.spec.tags && (
                          <div className="flex items-center gap-1">
                            {pkg.spec.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Download Progress Bar if active */}
                      {prog && (
                        <div className="mt-2.5 p-2 bg-slate-950/80 border border-cyan-500/30 rounded-lg flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-cyan-300 font-semibold">{prog.stage}</span>
                            <span className="font-mono text-cyan-400">{prog.percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-200"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Dùng thử / Cài / Gỡ / Báo lỗi */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {/* Dùng thử (Try / Preview directly) */}
                      <button
                        onClick={() => handleTryEffect(pkg)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        title="Dùng thử trực tiếp trên clip đang chọn trên timeline"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dùng thử</span>
                      </button>

                      {/* Install / Cancel / Installed */}
                      {prog ? (
                        <button
                          onClick={() => handleCancelInstall(pkg.id)}
                          className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold transition-colors"
                          title="Hủy quá trình tải xuống"
                        >
                          Hủy tải
                        </button>
                      ) : pkg.isInstalled ? (
                        <div className="flex items-center gap-1">
                          <span className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium">
                            <Check className="w-3.5 h-3.5" /> Đã cài
                          </span>
                          <button
                            onClick={() => handleUninstall(pkg.id, pkg.name)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            title="Gỡ cài đặt gói khỏi thiết bị"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInstallWithProgress(pkg)}
                          disabled={installingId === pkg.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-md shadow-cyan-500/20 disabled:opacity-50 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          title="Tải và cài đặt gói vào bộ nhớ máy"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Cài đặt</span>
                        </button>
                      )}

                      {/* Báo lỗi / Diagnostic Info */}
                      <button
                        onClick={() => handleReportError(pkg)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-lg transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        title="Sao chép thông tin chẩn đoán lỗi (Diagnostic Info)"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* M6: AI Generator Drawer / Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700 rounded-2xl max-w-lg w-full p-5 flex flex-col gap-4 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                Trợ Lý AI Viết Hiệu Ứng GLSL (M6)
              </span>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed">
              {AI_PRIVACY_WARNING}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-300">Mô tả hiệu ứng muốn tạo</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ví dụ: Hiệu ứng glitch nhiễu sóng kèm viền neon phát sáng giật theo beat..."
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
              >
                Đóng
              </button>
              <button
                onClick={async () => {
                  setIsGeneratingAi(true);
                  try {
                    const res = await generateEffectWithAI({
                      prompt: aiPrompt,
                      config: { enabled: true, userConsented: true, apiKey: aiApiKey, provider: 'mock' },
                      maxRetries: 3,
                    });
                    if (res.success && res.item) {
                      await saveAiEffectToMyEffects(res.item);
                      showToast('Đã tạo thành công và lưu vào "Của tôi"!', 'success');
                      setShowAiModal(false);
                      loadData();
                    } else {
                      showToast(res.error || 'AI không thể tạo shader', 'error');
                    }
                  } finally {
                    setIsGeneratingAi(false);
                  }
                }}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGeneratingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isGeneratingAi ? 'Đang tạo...' : 'Tạo hiệu ứng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
