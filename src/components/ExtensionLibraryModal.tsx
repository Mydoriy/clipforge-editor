import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Download,
  Upload,
  Check,
  ShieldCheck,
  Globe,
  FileCode,
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
  type SearchResultItem,
} from '../utils/extensionRegistryManager';
import type { AssetKind, TrustLevel } from '../types/extensionRegistry';
import type { InstalledAssetEntity } from '../db';

interface ExtensionLibraryModalProps {
  initialKind?: AssetKind;
}

export const ExtensionLibraryModal: React.FC<ExtensionLibraryModalProps> = ({ initialKind }) => {
  const { closeModal, showToast, clips, setClips } = useEditorStore();
  const [query, setQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<AssetKind | 'all'>(initialKind || 'all');
  const [selectedTrust, setSelectedTrust] = useState<TrustLevel | 'all'>('all');
  const [packages, setPackages] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customRegistryInput, setCustomRegistryInput] = useState(getRegistryUrl());
  const [revokedAssets, setRevokedAssets] = useState<InstalledAssetEntity[]>([]);
  const [autoUpdatePatches, setAutoUpdatePatches] = useState(getAutoUpdateOfficialPatchesSetting());
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

  const handleToggleAiEnabled = (enabled: boolean) => {
    setAiEnabled(enabled);
    localStorage.setItem('clipforge_ai_enabled', enabled ? 'true' : 'false');
  };

  const handleToggleAiConsented = (consented: boolean) => {
    setAiConsented(consented);
    localStorage.setItem('clipforge_ai_consented', consented ? 'true' : 'false');
  };

  const handleSaveApiKey = (key: string) => {
    setAiApiKey(key);
    localStorage.setItem('clipforge_ai_key', key);
  };

  const handleRunAiGeneration = async () => {
    if (!aiEnabled) {
      showToast('Tính năng AI viết hiệu ứng đang TẮT. Vui lòng bật tính năng bên dưới.', 'warning');
      return;
    }
    if (!aiConsented) {
      showToast('Vui lòng xác nhận đồng ý điều khoản gửi dữ liệu ra máy chủ ngoài.', 'warning');
      return;
    }
    if (aiProvider !== 'mock' && !aiApiKey.trim()) {
      showToast('Vui lòng nhập API Key hợp lệ cho nhà cung cấp AI.', 'warning');
      return;
    }
    if (!aiPrompt.trim()) {
      showToast('Vui lòng nhập mô tả hiệu ứng muốn tạo.', 'warning');
      return;
    }

    setIsGeneratingAi(true);
    setAiResult(null);
    setAiSaveSuccess(false);
    setAiStatusMsg('Đang gọi AI & tự động kiểm tra Zod -> Phân tích tĩnh -> Sandbox WebGL2 compile...');

    try {
      const res = await generateEffectWithAI({
        prompt: aiPrompt,
        config: {
          enabled: aiEnabled,
          userConsented: aiConsented,
          apiKey: aiApiKey,
          provider: aiProvider,
        },
        includeReferenceFrames: aiIncludeFrames,
        referenceFrames: aiIncludeFrames ? ['data:image/webp;base64,sample1', 'data:image/webp;base64,sample2'] : [],
        maxRetries: 3,
      });

      if (res.success && res.item) {
        setAiResult(res);
        setAiParamValues(res.preview?.testParameters || {});
        showToast(`Tạo thành công sau ${res.iterations} lần sửa tự động!`, 'success');
      } else {
        showToast(res.error || 'AI không thể tạo shader hợp lệ', 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsGeneratingAi(false);
      setAiStatusMsg('');
    }
  };

  const handleKeepAiEffect = async () => {
    if (!aiResult?.item) return;
    try {
      const res = await saveAiEffectToMyEffects(aiResult.item);
      if (res.success) {
        setAiSaveSuccess(true);
        showToast('Đã lưu hiệu ứng vào "Hiệu ứng của tôi"! Timeline không bị thay đổi.', 'success');
        loadData();
      } else {
        showToast(`Lưu thất bại: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi lưu: ${err.message}`, 'error');
    }
  };

  // Scan for ghost clips in active timeline
  const ghostClips = clips.filter((c: any) => c.ghostRef || c.isGhostPlaceholder);

  const loadData = async (forceOnline = false) => {
    setIsLoading(true);
    try {
      if (forceOnline) {
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
    } catch (err) {
      console.error(err);
      showToast('Không thể nạp danh sách tài nguyên cục bộ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query, selectedKind, selectedTrust]);

  const handleCheckUpdatesNow = async () => {
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
  };

  const handleSaveCustomRegistry = () => {
    const val = customRegistryInput.trim();
    setCustomRegistryUrl(val);
    setShowSettings(false);
    showToast(`Đã cập nhật kho: ${val || DEFAULT_REGISTRY_URL}`, 'success');
    loadData(true);
  };

  const handleResetCustomRegistry = () => {
    resetRegistryUrl();
    setCustomRegistryInput(DEFAULT_REGISTRY_URL);
    setShowSettings(false);
    showToast('Đã đặt lại về Kho chính thức mặc định', 'info');
    loadData(true);
  };

  const handleInstall = async (pkg: SearchResultItem) => {
    setInstallingId(pkg.id);
    try {
      const res = await installPackage(pkg);
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

      // Automatically reconnect ghost clips on timeline
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
    }
  };

  const handleUninstall = async (id: string, name: string) => {
    try {
      // M4: Check projects currently using this asset
      const safety = await checkUninstallSafety(id);
      if (safety.affectedProjects.length > 0) {
        const projNames = safety.affectedProjects.map((p) => `"${p.title}"`).join(', ');
        const confirmed = window.confirm(
          `Hiệu ứng "${name}" đang được sử dụng trong ${safety.affectedProjects.length} dự án (${projNames}).\n\nSau khi gỡ, các khung hình trong các dự án trên sẽ được chuyển sang Ghost Reference (giữ nguyên vị trí và tự nối lại khi cài lại sau này).\n\nBạn có chắc chắn muốn gỡ cài đặt không?`
        );
        if (!confirmed) return;
      }
      const res = await safeUninstallPackage(id);
      showToast(
        `Đã gỡ bỏ "${name}" khỏi thiết bị (${res.affectedProjects.length} dự án đã chuyển khung hình sang Ghost Reference)`,
        'info'
      );
      await loadData();
    } catch (err: any) {
      showToast(`Lỗi gỡ bỏ: ${err?.message}`, 'error');
    }
  };

  const handleCompareVersions = async (pkg: SearchResultItem) => {
    const installed = await getInstalledAssets();
    const inst = installed.find((i) => i.id === pkg.id);
    if (!inst) {
      showToast('Gói chưa được cài đặt trong máy để so sánh', 'info');
      return;
    }
    const diff = compareEffectVersions(inst.spec, pkg.spec);
    setDiffModalInfo(diff);
  };

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

  const renderTrustBadge = (trust: TrustLevel) => {
    switch (trust) {
      case 'official':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Chính thức (Official)
          </span>
        );
      case 'community':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Globe className="w-3 h-3" /> Cộng đồng (Community)
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <FileCode className="w-3 h-3" /> Nhập thủ công (Manual)
          </span>
        );
      case 'local_fallback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3 h-3" /> Ghép cục bộ (Fallback)
          </span>
        );
      case 'ai_generated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-pink-500/15 text-pink-400 border border-pink-500/30">
            <Sparkles className="w-3 h-3" /> Do AI tạo – chưa kiểm duyệt
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Kho Mở Rộng Tài Nguyên (Extension Registry)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Hiệu ứng WebGL2, Chuyển cảnh, 3D LUT, SFX & Nhãn dán khai báo • Hoạt động 100% Ngoại tuyến
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Check Updates Now (Bypass 24h throttle) */}
          <button
            onClick={handleCheckUpdatesNow}
            disabled={isCheckingUpdates}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 rounded-lg text-xs font-semibold text-cyan-300 transition-colors disabled:opacity-50"
            title="Đồng bộ chỉ mục mới nhất từ máy chủ tĩnh (bỏ qua giới hạn 24h)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdates ? 'Đang đồng bộ...' : 'Kiểm tra ngay'}</span>
          </button>

          {/* M6: AI Effect & Shader Synthesis Trigger */}
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-950/60 to-purple-950/60 hover:from-pink-900/80 hover:to-purple-900/80 border border-pink-500/40 rounded-lg text-xs font-semibold text-pink-300 transition-colors"
            title="Khởi tạo Shader & Hiệu ứng WebGL2 bằng trợ lý AI (M6)"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Tạo bằng AI (M6)</span>
          </button>

          {/* Toggle Custom Registry Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSettings
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
            title="Cài đặt đường dẫn Kho mở rộng tùy chỉnh"
          >
            <Settings className="w-4 h-4" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".capfx,.json,.pkg.json,.cube"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            title="Nhập gói .capfx (ZIP), .pkg.json hoặc tệp 3D LUT .cube từ máy tính"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nhập gói (.capfx / .cube)</span>
          </button>
          <button
            onClick={closeModal}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Custom Registry Settings Panel */}
      {showSettings && (
        <div className="mt-3 p-3 bg-slate-900/90 border border-cyan-500/30 rounded-xl flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-cyan-400" /> Cấu hình Đường dẫn Kho Tùy Chỉnh (Custom Static Registry)
            </span>
            <span className="text-[10px] text-slate-400">Hỗ trợ Cloudflare R2 / Pages, GitHub Pages, Localhost</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customRegistryInput}
              onChange={(e) => setCustomRegistryInput(e.target.value)}
              placeholder="https://my-team-effects.internal/registry/index.json hoặc /registry/index.json"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSaveCustomRegistry}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              Lưu kho
            </button>
            <button
              onClick={handleResetCustomRegistry}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors shrink-0"
            >
              Mặc định
            </button>
          </div>

          {/* M4: Auto-update patch toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={autoUpdatePatches}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoUpdatePatches(val);
                  setAutoUpdateOfficialPatchesSetting(val);
                  showToast(
                    val
                      ? 'Đã bật: Tự động cập nhật các bản vá (patch) an toàn của gói Chính thức'
                      : 'Đã tắt tự động cập nhật bản vá',
                    'info'
                  );
                }}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-950"
              />
              <span className="font-semibold text-[11px]">Tự cập nhật bản vá (patch) của gói Chính thức</span>
            </label>
            <span className="text-[10px] text-slate-400">Bản minor/major luôn yêu cầu xác nhận thủ công</span>
          </div>

          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            * Lưu ý bảo mật: Các gói tải từ kho tự host mà không có chữ ký số Ed25519 chính thức sẽ tự động xếp mức "Cộng đồng" để bảo vệ an toàn cho thiết bị.
          </p>
        </div>
      )}

      {/* Revocation Kill Switch Alert Banner */}
      {revokedAssets.length > 0 && (
        <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex flex-col gap-1.5 text-xs text-rose-300">
          <div className="flex items-center gap-2 font-bold text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠️ Cảnh báo Kill Switch: Phát hiện {revokedAssets.length} tài nguyên đã bị thu hồi</span>
          </div>
          <p className="text-[11px] text-rose-300/90 pl-6">
            Các gói này đã bị nhà phát triển vô hiệu hóa do lỗi bảo mật hoặc gây tràn bộ nhớ GPU. Toàn bộ vị trí trên timeline sử dụng gói này đã được tự động chuyển sang Ghost Reference an toàn:
          </p>
          <div className="flex flex-col gap-1 pl-6 pt-1">
            {revokedAssets.map((rev) => (
              <div key={rev.id} className="text-[11px] bg-rose-950/60 p-2 rounded border border-rose-500/30 flex items-center justify-between">
                <span>• <strong>{rev.name}</strong> ({rev.id}): {rev.revokeReason}</span>
                {rev.replacementId && (
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                    Đề xuất thay thế: {rev.replacementId}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Guarantee Pill */}
      <div className="mt-3 flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Bảo vệ Quyền Riêng Tư 100%:</strong> Chỉ mục được nạp về máy và tìm kiếm cục bộ. Không gửi từ khóa
            hoặc dữ liệu video ra ngoài mạng.
          </span>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
          CLIENT-SIDE ONLY
        </span>
      </div>

      {/* Ghost Reference Warning Banner if missing clips found */}
      {ghostClips.length > 0 && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Timeline hiện có <strong>{ghostClips.length}</strong> clip giữ vị trí tạm thời (Ghost Reference). Khi cài đặt
            gói tương ứng, hiệu ứng sẽ tự động kết nối lại mà không làm mất cấu trúc dự án!
          </span>
        </div>
      )}

      {/* M7: Security Diagnostic Info Banner on Installation/Verification Error */}
      {lastErrorDiagnostic && (
        <div className="mt-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-rose-200">
              <strong>Lỗi an toàn:</strong> {lastErrorDiagnostic.message}
            </span>
          </div>
          <button
            onClick={() => {
              const codeMatch = lastErrorDiagnostic.message.match(/\[(ERR_[A-Z_]+)\]/);
              const diag = generateDiagnosticInfo(
                (codeMatch ? codeMatch[1] : 'ERR_GLSL_CODE_TOO_LONG') as any,
                {
                  packId: lastErrorDiagnostic.packId,
                  version: lastErrorDiagnostic.version,
                  sha256: lastErrorDiagnostic.sha256,
                  message: lastErrorDiagnostic.message,
                }
              );
              copyDiagnosticInfoToClipboard(diag);
              showToast('Đã sao chép thông tin chẩn đoán lỗi (Diagnostic Info)!', 'info');
            }}
            className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 rounded-lg text-[11px] font-semibold text-rose-200 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Sao chép chẩn đoán (Copy Diagnostic)</span>
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="mt-4 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hiệu ứng, mô tả, thẻ hoặc ID (100% Cục bộ)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {/* Trust Filter */}
          <select
            value={selectedTrust}
            onChange={(e) => setSelectedTrust(e.target.value as any)}
            className="px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tất cả mức tin cậy</option>
            <option value="official">Chính thức (Official)</option>
            <option value="community">Cộng đồng (Community)</option>
            <option value="manual">Nhập thủ công (Manual)</option>
            <option value="ai_generated">Do AI tạo – chưa kiểm duyệt</option>
          </select>
        </div>
      </div>

      {/* Kind Navigation Pills */}
      <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
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
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedKind === tab.id
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Packages List */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
            <p className="text-xs">Đang tìm kiếm kho tài nguyên cục bộ...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Layers className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Không tìm thấy tài nguyên phù hợp</p>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có thể nhập tệp .pkg.json hoặc bảng màu 3D LUT .cube trực tiếp bằng nút "Nhập gói".
            </p>
          </div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-100 truncate">{pkg.name}</h3>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                    v{pkg.version}
                  </span>
                  {renderTrustBadge(pkg.trustLevel)}
                  {pkg.trustLevel === 'official' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1.5 py-0.5 rounded" title="Chữ ký mật mã Ed25519 chính thức">
                      <Lock className="w-2.5 h-2.5 text-cyan-400" /> Ed25519
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {pkg.license}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-2">{pkg.description}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>Tác giả: <strong className="text-slate-300">{pkg.spec.author}</strong></span>
                  <span>Dung lượng: <strong className="text-slate-300">{pkg.sizeBytes} B</strong></span>
                  <span className="font-mono text-[10px] text-slate-500">SHA: {pkg.hash.slice(0, 10)}...</span>
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
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => exportPackageToFile(pkg)}
                  title="Xuất tệp .pkg.json ra máy để sao lưu hoặc chia sẻ"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {pkg.isInstalled ? (
                  <div className="flex items-center gap-1.5">
                    {pkg.hasUpdate ? (
                      <>
                        <button
                          onClick={() => handleCompareVersions(pkg)}
                          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="So sánh thay đổi trước / sau giữa phiên bản trong máy và bản mới"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>So sánh</span>
                        </button>
                        <button
                          onClick={() => handleInstall(pkg)}
                          disabled={installingId === pkg.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors"
                          title={`Cập nhật lên phiên bản mới v${pkg.version}`}
                        >
                          {installingId === pkg.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3 h-3" />
                          )}
                          <span>Cập nhật v{pkg.version}</span>
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium">
                        <Check className="w-3.5 h-3.5" /> Đã cài đặt
                      </span>
                    )}
                    <button
                      onClick={() => handleUninstall(pkg.id, pkg.name)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                      title="Gỡ bỏ tài nguyên này khỏi máy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInstall(pkg)}
                    disabled={installingId === pkg.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {installingId === pkg.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Cài đặt</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* M4: Version Diff Comparison Modal Dialog */}
      {diffModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">So sánh Trước / Sau (Version Comparison)</h3>
              </div>
              <button
                onClick={() => setDiffModalInfo(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-cyan-300 font-bold">{diffModalInfo.id}</span>
              <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {diffModalInfo.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="font-semibold text-emerald-400">Uniforms mới ({diffModalInfo.addedUniforms.length}):</span>
                {diffModalInfo.addedUniforms.length === 0 ? (
                  <span className="text-slate-500 italic">Không có</span>
                ) : (
                  diffModalInfo.addedUniforms.map((u: string) => (
                    <span key={u} className="font-mono text-[10px] text-emerald-300">+ {u}</span>
                  ))
                )}
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="font-semibold text-rose-400">Uniforms bị gỡ ({diffModalInfo.removedUniforms.length}):</span>
                {diffModalInfo.removedUniforms.length === 0 ? (
                  <span className="text-slate-500 italic">Không có</span>
                ) : (
                  diffModalInfo.removedUniforms.map((u: string) => (
                    <span key={u} className="font-mono text-[10px] text-rose-300">- {u}</span>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400 text-[11px]">
                {diffModalInfo.shaderChanged ? '⚡ Mã GLSL fragment shader có sửa đổi.' : '✓ Mã fragment shader tương đương.'}
              </span>
              <button
                onClick={() => setDiffModalInfo(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* M6: AI Effect & Shader Synthesis Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Trợ Lý AI Viết Hiệu Ứng (M6)
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Tùy chọn • Tự động sửa 3 lần
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Khởi tạo Shader GLSL ES 3.00 & tham số khai báo bằng AI</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy Warning Banner (MANDATORY) */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-amber-300">Cảnh báo quyền riêng tư (Nội dung rời khỏi máy)</span>
                <p className="text-amber-200/80 leading-relaxed">
                  {AI_PRIVACY_WARNING}
                </p>
                <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aiConsented}
                    onChange={(e) => handleToggleAiConsented(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span className="font-medium text-amber-300">
                    Tôi xác nhận đồng ý gửi mô tả văn bản (và ảnh tham chiếu nếu chọn) ra máy chủ AI bên ngoài
                  </span>
                </label>
              </div>
            </div>

            {/* Config: Toggle Opt-In & API Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => handleToggleAiEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-0"
                  />
                  <span>Bật tính năng AI viết hiệu ứng (Mặc định: TẮT)</span>
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-400">Nhà cung cấp:</span>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value as any)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  >
                    <option value="mock">Môi trường thử nghiệm (Offline Mock)</option>
                    <option value="openai">OpenAI (gpt-4o-mini)</option>
                    <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-slate-400">
                  API Key {aiProvider === 'mock' ? '(Không bắt buộc với Mock)' : '(Bắt buộc)'}:
                </span>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder={aiProvider === 'mock' ? 'Môi trường thử nghiệm không cần key' : 'Nhập sk-... hoặc AIza...'}
                  disabled={aiProvider === 'mock'}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500 italic">API key chỉ lưu cục bộ trên trình duyệt, không chia sẻ.</span>
              </div>
            </div>

            {/* Prompt Input & Reference Frames */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-200">
                Mô tả hiệu ứng muốn tạo (bằng tiếng Việt hoặc tiếng Anh):
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Hiệu ứng gợn sóng nước hologram phát sáng màu neon cyberpunk, chuyển động chậm theo thời gian..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={aiIncludeFrames}
                    onChange={(e) => setAiIncludeFrames(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-0"
                  />
                  <span>Gửi kèm tối đa 6 khung hình tham chiếu độ phân giải thấp (≤ 160x90) từ clip hiện tại</span>
                </label>
                <button
                  onClick={handleRunAiGeneration}
                  disabled={isGeneratingAi || !aiEnabled || !aiConsented}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-900/30"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAi ? 'Đang tạo & tự sửa...' : 'Khởi tạo Shader bằng AI'}</span>
                </button>
              </div>
              {aiStatusMsg && (
                <div className="text-[11px] text-pink-400 bg-pink-950/40 border border-pink-800/40 p-2 rounded-lg flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{aiStatusMsg}</span>
                </div>
              )}
            </div>

            {/* Generated Result Preview & Benchmark */}
            {aiResult && aiResult.success && aiResult.item && (
              <div className="flex flex-col gap-3 p-4 bg-slate-950 rounded-xl border border-pink-500/40">
                {/* Result Badges & Cost Benchmark */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {AI_UNVERIFIED_LABEL_VI}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Sửa tự động: <strong className="text-white">{aiResult.iterations} lượt</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-cyan-300 font-mono">
                      <Cpu className="w-3 h-3" />
                      ~{aiResult.preview?.benchmark.msPerFrame1080p} ms/frame ở 1080p
                    </span>
                    <span className="text-slate-500">Passes: {aiResult.preview?.benchmark.passes}</span>
                  </div>
                </div>

                {/* 5 Sample Frames Preview */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">5 Frame mẫu xem trước (t = 0.0s đến 2.0s):</span>
                  <div className="grid grid-cols-5 gap-2">
                    {aiResult.preview?.sampleFrames.map((thumb, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group">
                        <img src={thumb} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono bg-black/70 px-1 rounded text-slate-300">
                          {idx * 0.5}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Parameter Sliders */}
                {aiResult.item.paramSchema && Object.keys(aiResult.item.paramSchema).length > 0 && (
                  <div className="flex flex-col gap-2 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-cyan-400" /> Kéo thử tham số tương tác:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {Object.entries(aiResult.item.paramSchema).map(([key, schema]: [string, any]) => (
                        <div key={key} className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>{schema.label?.vi || key}</span>
                            <span className="font-mono text-cyan-300">{aiParamValues[key] ?? schema.default}</span>
                          </div>
                          {schema.type === 'number' && (
                            <input
                              type="range"
                              min={schema.min ?? 0}
                              max={schema.max ?? 2}
                              step={schema.step ?? 0.05}
                              value={aiParamValues[key] ?? schema.default}
                              onChange={(e) =>
                                setAiParamValues({ ...aiParamValues, [key]: parseFloat(e.target.value) })
                              }
                              className="accent-pink-500 h-1 bg-slate-800 rounded cursor-pointer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons: Keep vs Discard */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] italic">
                    * Không bao giờ tự động thêm vào timeline. Bấm "Giữ" để lưu vào Thư viện.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAiResult(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                    >
                      Bỏ qua / Thử lại
                    </button>
                    <button
                      onClick={handleKeepAiEffect}
                      disabled={aiSaveSuccess}
                      className={`px-4 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        aiSaveSuccess
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/30'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{aiSaveSuccess ? 'Đã lưu vào Thư viện' : 'Giữ (Lưu vào Hiệu ứng của tôi)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800 mt-2 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>
          Nguyên tắc: Chỉ dữ liệu khai báo (JSON + GLSL ES 3.00) • Tuyệt đối không chạy JS/WASM • Ghim phiên bản dự án.
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono">Dexie IndexedDB v4 (installedAssets, LRU lastUsedAt)</span>
        </div>
      </div>
    </div>
  );
};
