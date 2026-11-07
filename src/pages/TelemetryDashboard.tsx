import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import {
  Activity,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  Layers,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Cpu,
  Monitor,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  computeTelemetryMetrics,
  getTelemetryConsent,
  setTelemetryConsent,
  clearStoredTelemetryEvents,
  type TelemetryMetrics
} from '../utils/telemetry';
import { APP_VERSION } from '../constants/version';
import { confirmDialog } from '../store/useEditorStore';

export const TelemetryDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [consent, setConsent] = useState<'granted' | 'denied' | 'pending'>('denied');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    setConsent(getTelemetryConsent());
    setMetrics(computeTelemetryMetrics());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleConsent = () => {
    const next = consent === 'granted' ? 'denied' : 'granted';
    setTelemetryConsent(next);
    setConsent(next);
    loadData();
    showToast(next === 'granted' ? 'Đã bật thu thập telemetry ẩn danh' : 'Đã tắt hoàn toàn telemetry');
  };

  const handleClear = async () => {
    const confirmed = await confirmDialog({
      title: 'Xóa dữ liệu đo lường?',
      message: 'Toàn bộ các sự kiện telemetry và nhật ký đo lường đã lưu cục bộ trên trình duyệt sẽ bị xóa sạch.',
      confirmText: 'Xóa dữ liệu',
      cancelText: 'Hủy',
      type: 'warning',
      badgeIcon: 'warning'
    });
    if (confirmed) {
      clearStoredTelemetryEvents();
      loadData();
      showToast('Đã xóa toàn bộ dữ liệu đo lường cục bộ!');
    }
  };

  if (!metrics) return null;

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 w-full bg-[#080B12]/85 backdrop-blur-md border-b border-[#1A2234] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#8E9BB0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trang chủ</span>
          </Link>
          <div className="h-4 w-px bg-[#1A2234]" />
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-xs font-bold text-white">Internal Telemetry</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px]">
              v{APP_VERSION}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleConsent}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              consent === 'granted'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            {consent === 'granted' ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Trạng thái: Đang BẬT</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-rose-400" />
                <span>Trạng thái: Đang TẮT (Opt-in)</span>
              </>
            )}
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[#141B2D] hover:bg-[#1E2842] text-[#8E9BB0] hover:text-white border border-[#232F4A] transition-colors"
            title="Tải lại số liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa sự kiện</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-medium shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* 2. Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-10 flex flex-col gap-8">
        {/* Banner Privacy Notice */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#0D121F] to-indigo-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Dashboard Đo Lường Kỹ Thuật Tôn Trọng Quyền Riêng Tư</h2>
              <p className="text-xs text-[#8E9BB0]">
                Số liệu được thu thập hoàn toàn ẩn danh, không cookie theo dõi. Tuyệt đối không gửi nội dung video, tên file hay tên project.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-[11px] font-bold shrink-0">
            Tổng {metrics.totalEvents} sự kiện
          </span>
        </div>

        {/* 3. Top Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Export Success Rate */}
          <div className="p-5 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8E9BB0]">
              <span className="font-semibold">Tỉ lệ Export Thành Công</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{metrics.exportStats.successRate}%</span>
              <span className="text-xs text-[#6B7A90]">
                ({metrics.exportStats.success}/{metrics.exportStats.total} lượt)
              </span>
            </div>
            <div className="w-full bg-[#1A2234] h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.exportStats.successRate}%` }}
              />
            </div>
          </div>

          {/* Card 2: WebCodecs Hardware Support */}
          <div className="p-5 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8E9BB0]">
              <span className="font-semibold">Máy Hỗ Trợ WebCodecs</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-300">
                {metrics.webCodecsRatio.percentage}%
              </span>
              <span className="text-xs text-[#6B7A90]">
                ({metrics.webCodecsRatio.supported} máy)
              </span>
            </div>
            <div className="w-full bg-[#1A2234] h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.webCodecsRatio.percentage}%` }}
              />
            </div>
          </div>

          {/* Card 3: Onboarding Completion */}
          <div className="p-5 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8E9BB0]">
              <span className="font-semibold">Hoàn Thành Onboarding</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-300">
                {metrics.onboardingFunnel.completionRate}%
              </span>
              <span className="text-xs text-rose-400">
                (Rơi {metrics.onboardingFunnel.dropoffRate}%)
              </span>
            </div>
            <div className="w-full bg-[#1A2234] h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-purple-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.onboardingFunnel.completionRate}%` }}
              />
            </div>
          </div>

          {/* Card 4: Total Errors Recorded */}
          <div className="p-5 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#8E9BB0]">
              <span className="font-semibold">Sự Cố Kỹ Thuật (Errors)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300">
                {metrics.topErrors.reduce((acc, curr) => acc + curr.count, 0)}
              </span>
              <span className="text-xs text-[#6B7A90]">
                ({metrics.topErrors.length} loại mã lỗi)
              </span>
            </div>
            <span className="text-[10px] text-[#6B7A90] truncate">
              Mã lỗi phổ biến nhất:{' '}
              <strong className="text-amber-400">{metrics.topErrors[0]?.code || 'Không có'}</strong>
            </span>
          </div>
        </div>

        {/* 4. Export Duration Percentiles (p50 / p95 by Resolution) */}
        <section className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1A2234] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Thời Gian Export Theo Độ Phân Giải (p50 / p95)</h3>
            </div>
            <span className="text-xs text-[#6B7A90]">Đơn vị: Mili-giây (ms)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['720p', '1080p', '4k'] as const).map((res) => {
              const p = metrics.exportPercentiles[res];
              return (
                <div key={res} className="p-4 rounded-xl bg-[#141B2D] border border-[#1E2842] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">{res}</span>
                    <span className="text-[10px] text-[#6B7A90] font-mono">{p.count} mẫu đo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1A2234]">
                      <span className="text-[10px] text-[#8E9BB0] block">p50 (Trung vị)</span>
                      <span className="text-lg font-black text-cyan-400">
                        {p.p50 > 0 ? `${(p.p50 / 1000).toFixed(1)}s` : 'Chưa có'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1A2234]">
                      <span className="text-[10px] text-[#8E9BB0] block">p95 (95% người dùng)</span>
                      <span className="text-lg font-black text-amber-400">
                        {p.p95 > 0 ? `${(p.p95 / 1000).toFixed(1)}s` : 'Chưa có'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Browser & OS Distribution & Top Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Errors Table */}
          <section className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#1A2234] pb-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-white text-sm">Top Mã Lỗi Kỹ Thuật (Top Errors)</h3>
            </div>
            {metrics.topErrors.length === 0 ? (
              <p className="text-xs text-[#6B7A90] py-6 text-center">Không ghi nhận lỗi nào!</p>
            ) : (
              <div className="space-y-2">
                {metrics.topErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#141B2D] border border-[#1E2842] flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-rose-300 font-semibold">{err.code}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[11px]">
                      {err.count} lần
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Browser & OS Distribution */}
          <section className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[#1A2234] pb-3">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Phân Bố Trình Duyệt & Hệ Điều Hành</h3>
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">Trình duyệt:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(metrics.browserDistribution).map(([b, cnt]) => (
                  <div key={b} className="p-2.5 rounded-xl bg-[#141B2D] border border-[#1E2842] text-center">
                    <span className="text-[10px] text-[#8E9BB0] block">{b}</span>
                    <span className="text-sm font-bold text-white">{cnt}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs font-semibold text-slate-300 pt-2">Hệ điều hành:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(metrics.osDistribution).map(([os, cnt]) => (
                  <div key={os} className="p-2.5 rounded-xl bg-[#141B2D] border border-[#1E2842] text-center">
                    <span className="text-[10px] text-[#8E9BB0] block">{os}</span>
                    <span className="text-sm font-bold text-white">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 6. Top Features Used */}
        <section className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-[#1A2234] pb-3">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Tính Năng Được Dùng Nhiều Nhất</h3>
          </div>
          {metrics.topFeatures.length === 0 ? (
            <p className="text-xs text-[#6B7A90] py-4 text-center">Chưa có số liệu tính năng.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.topFeatures.map((f, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#141B2D] border border-[#1E2842] flex flex-col gap-1">
                  <span className="text-xs font-semibold text-emerald-300 truncate">{f.feature}</span>
                  <span className="text-lg font-black text-white">{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 7. Recent Anonymous Events Log */}
        <section className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1A2234] pb-3">
            <h3 className="font-bold text-white text-sm">Nhật Ký Sự Kiện Ẩn Danh Gần Nhất (Top 25)</h3>
            <span className="text-xs text-[#6B7A90]">Dữ liệu được lưu trong IndexedDB / LocalStorage</span>
          </div>

          {metrics.recentEvents.length === 0 ? (
            <p className="text-xs text-[#6B7A90] py-6 text-center">Chưa có sự kiện nào được ghi nhận.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1A2234] text-[#8E9BB0]">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Tên sự kiện</th>
                    <th className="py-2.5 px-3">Nền tảng</th>
                    <th className="py-2.5 px-3">WebCodecs</th>
                    <th className="py-2.5 px-3">Dữ liệu ẩn danh (Sanitized)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2234]/60 font-mono text-[11px]">
                  {metrics.recentEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#141B2D]/50 transition-colors">
                      <td className="py-2 px-3 text-[#6B7A90]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-cyan-400 font-bold">{ev.name}</td>
                      <td className="py-2 px-3 text-[#CBD5E1]">
                        {ev.browser} / {ev.os}
                      </td>
                      <td className="py-2 px-3">
                        {ev.hasWebCodecs ? (
                          <span className="text-emerald-400">Có</span>
                        ) : (
                          <span className="text-rose-400">Không</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#8E9BB0] truncate max-w-xs">
                        {JSON.stringify(ev.data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
