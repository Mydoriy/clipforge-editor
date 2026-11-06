import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Copy, Check } from 'lucide-react';

interface Props {
  panelName: string;
  children: ReactNode;
  fallbackHeight?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 1. Local error journal logging
    try {
      const logsRaw = localStorage.getItem('clipforge_panel_errors') || '[]';
      const logs = JSON.parse(logsRaw);
      logs.unshift({
        panel: this.props.panelName,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
      // Keep last 25 error logs
      localStorage.setItem('clipforge_panel_errors', JSON.stringify(logs.slice(0, 25)));
    } catch (e) {
      console.warn('Failed to persist local error log:', e);
    }

    // 2. Optional Sentry logging (only if explicitly enabled by user consent)
    const sentryConsent = localStorage.getItem('clipforge_sentry_consent') === 'true';
    if (sentryConsent && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { panel: this.props.panelName },
        extra: errorInfo
      });
    }
  }

  handleCopyDiagnostics = async () => {
    try {
      const systemInfo = {
        panel: this.props.panelName,
        errorMessage: this.state.error?.message,
        errorStack: this.state.error?.stack,
        time: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        webCodecs: typeof window !== 'undefined' && 'VideoEncoder' in window,
        webGpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
        fileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
        screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
        memory: (performance as any)?.memory
          ? {
              usedJSHeap: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + ' MB',
              totalJSHeap: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + ' MB'
            }
          : 'N/A'
      };

      await navigator.clipboard.writeText(JSON.stringify(systemInfo, null, 2));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.warn('Copy diagnostics failed:', e);
    }
  };

  handleReloadPanel = () => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 bg-[#14161F] border border-rose-500/30 rounded-lg text-center text-slate-200 select-none animate-in fade-in"
          style={{ minHeight: this.props.fallbackHeight || '160px' }}
        >
          <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2.5 shadow-lg">
            <AlertTriangle className="w-4 h-4" />
          </div>

          <span className="font-bold text-xs text-white mb-0.5">Sự cố tại panel: {this.props.panelName}</span>
          <p className="text-[11px] text-slate-400 max-w-xs mb-3 truncate">
            {this.state.error?.message ||
              'Đã xảy ra lỗi không mong muốn nhưng các panel khác vẫn hoạt động bình thường.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReloadPanel}
              className="px-2.5 py-1 rounded bg-[#1FC8DB] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 cursor-pointer shadow transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục panel</span>
            </button>

            <button
              onClick={this.handleCopyDiagnostics}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{this.state.copied ? 'Đã sao chép' : 'Sao chép thông tin chẩn đoán'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
