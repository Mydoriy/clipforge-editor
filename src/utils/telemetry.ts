import { APP_VERSION } from '../constants/version.ts';

export type TelemetryConsent = 'granted' | 'denied' | 'pending';

export type TelemetryEventName =
  | 'project_created'
  | 'media_imported'
  | 'export_started'
  | 'export_success'
  | 'export_failed'
  | 'app_error'
  | 'feature_used'
  | 'onboarding_step';

export interface TelemetryEvent {
  id: string;
  name: TelemetryEventName;
  data: Record<string, any>;
  timestamp: string;
  browser: string;
  os: string;
  hasWebCodecs: boolean;
}

export interface PercentileResult {
  p50: number;
  p95: number;
  count: number;
}

export interface TelemetryMetrics {
  totalEvents: number;
  exportStats: {
    total: number;
    success: number;
    failed: number;
    successRate: number; // 0 - 100%
  };
  exportPercentiles: {
    '720p': PercentileResult;
    '1080p': PercentileResult;
    '4k': PercentileResult;
  };
  topErrors: Array<{ code: string; count: number }>;
  browserDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
  webCodecsRatio: {
    supported: number;
    unsupported: number;
    percentage: number;
  };
  onboardingFunnel: {
    started: number;
    completed: number;
    dropped: number;
    dropoffRate: number; // 0 - 100%
    completionRate: number;
  };
  topFeatures: Array<{ feature: string; count: number }>;
  recentEvents: TelemetryEvent[];
}

const CONSENT_STORAGE_KEY = 'clipforge_telemetry_consent';
const EVENTS_STORAGE_KEY = 'clipforge_telemetry_events';
const MAX_STORED_EVENTS = 500;

// Keys strictly prohibited from being collected to preserve privacy
const FORBIDDEN_KEYS = new Set([
  'name',
  'filename',
  'fileName',
  'title',
  'projectName',
  'project_name',
  'path',
  'filepath',
  'filePath',
  'content',
  'video',
  'src',
  'url',
  'email',
  'user',
  'userId',
  'token',
  'key',
  'apiKey',
  'password',
  'secret'
]);

/**
 * Check user's telemetry consent. Defaults to 'pending' (strictly OFF until opted in).
 */
export function getTelemetryConsent(): TelemetryConsent {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'denied';
  }
  const val = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (val === 'granted') return 'granted';
  if (val === 'denied') return 'denied';
  return 'pending';
}

/**
 * Set user's telemetry consent.
 */
export function setTelemetryConsent(consent: 'granted' | 'denied'): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  // Synchronize Sentry consent toggle with telemetry consent
  window.localStorage.setItem('clipforge_sentry_consent', consent === 'granted' ? 'true' : 'false');
}

/**
 * Returns true only if the user explicitly opted in.
 */
export function isTelemetryEnabled(): boolean {
  return getTelemetryConsent() === 'granted';
}

/**
 * Detect client platform anonymously without tracking cookies or canvas fingerprinting.
 */
export function getAnonymousClientContext(): { browser: string; os: string; hasWebCodecs: boolean } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', hasWebCodecs: false };
  }

  const ua = navigator.userAgent || '';
  let browser = 'Other';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = 'Other';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined';

  return { browser, os, hasWebCodecs };
}

/**
 * Deeply scrubs any sensitive user data (file names, paths, project titles, video content).
 */
export function sanitizeTelemetryData(data: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    // Drop forbidden keys immediately
    if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }

    if (typeof val === 'string') {
      // Scrub absolute file paths (C:\... or /Users/... or /home/...)
      let scrubbed = val
        .replace(/[A-Z]:\\[^\s]+\.(mp4|mov|webm|avi|mkv|jpg|png|gif|capproj)/gi, '[REDACTED_PATH]')
        .replace(/\/(Users|home|var|tmp)\/[^\s]+\.(mp4|mov|webm|avi|mkv|jpg|png|gif|capproj)/gi, '[REDACTED_PATH]');

      // Scrub URLs with query parameters (could contain tokens or keys)
      if (scrubbed.includes('http://') || scrubbed.includes('https://')) {
        try {
          const parsed = new URL(scrubbed);
          scrubbed = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
        } catch {
          scrubbed = '[REDACTED_URL]';
        }
      }

      clean[key] = scrubbed;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      clean[key] = val;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeTelemetryData(val);
    }
  }

  return clean;
}

/**
 * Record a telemetry event. Only active if user explicitly granted consent.
 */
export function trackEvent(name: TelemetryEventName, data: Record<string, any> = {}): void {
  // Respect opt-in consent: Do nothing if not explicitly granted
  if (!isTelemetryEnabled()) {
    return;
  }

  const client = getAnonymousClientContext();
  const sanitizedData = sanitizeTelemetryData(data);

  const event: TelemetryEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    name,
    data: sanitizedData,
    timestamp: new Date().toISOString(),
    browser: client.browser,
    os: client.os,
    hasWebCodecs: client.hasWebCodecs
  };

  // 1. Store in local ring-buffer for the internal dashboard
  persistLocalEvent(event);

  // 2. Dispatch to self-hosted cookieless endpoint if configured (Umami/Plausible format)
  dispatchToCookielessEndpoint(event);
}

/**
 * Store event in local ring buffer (max 500 events).
 */
function persistLocalEvent(event: TelemetryEvent): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    const events: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    events.unshift(event);
    if (events.length > MAX_STORED_EVENTS) {
      events.length = MAX_STORED_EVENTS;
    }
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Failed to persist telemetry event locally:', err);
  }
}

/**
 * Retrieve all locally recorded telemetry events.
 */
export function getStoredTelemetryEvents(): TelemetryEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all locally stored telemetry events.
 */
export function clearStoredTelemetryEvents(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(EVENTS_STORAGE_KEY);
}

/**
 * Dispatch event to privacy-respecting endpoint without third-party cookies.
 */
function dispatchToCookielessEndpoint(event: TelemetryEvent): void {
  const endpoint = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ENDPOINT) || '';
  if (!endpoint || typeof navigator === 'undefined') return;

  const payload = JSON.stringify({
    event: event.name,
    properties: event.data,
    meta: {
      browser: event.browser,
      os: event.os,
      webcodecs: event.hasWebCodecs,
      version: APP_VERSION,
      timestamp: event.timestamp
    }
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
    } else if (typeof fetch !== 'undefined') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch {
    // Fail silently to never interrupt user editing
  }
}

/**
 * Report errors with Sentry (Opt-in only), attaching APP_VERSION, System Check results,
 * and filtering sensitive data via beforeSend.
 */
export function reportError(error: Error | string, context: Record<string, any> = {}): void {
  // Strictly opt-in
  if (!isTelemetryEnabled()) {
    return;
  }

  const errObj = typeof error === 'string' ? new Error(error) : error;
  const client = getAnonymousClientContext();
  const cleanContext = sanitizeTelemetryData(context);

  // Track error code event
  trackEvent('app_error', {
    error_code: cleanContext.error_code || errObj.name || 'UNKNOWN_ERROR',
    error_category: cleanContext.error_category || 'runtime',
    message: errObj.message ? errObj.message.replace(/[A-Z]:\\[^\s]+/gi, '[PATH]') : 'Unknown error'
  });

  // If Sentry SDK is present on window, forward with beforeSend filtering
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('app_version', APP_VERSION);
        scope.setTag('browser', client.browser);
        scope.setTag('os', client.os);
        scope.setTag('has_webcodecs', client.hasWebCodecs);
        scope.setExtra('sanitized_context', cleanContext);
        (window as any).Sentry.captureException(errObj);
      });
    } catch (e) {
      console.warn('Sentry report error failed:', e);
    }
  }
}

/**
 * Sentry beforeSend hook to sanitize breadcrumbs and exceptions.
 */
export function sentryBeforeSend(event: any): any {
  if (!event) return null;

  // Redact URL query strings in request
  if (event.request && event.request.url) {
    try {
      const u = new URL(event.request.url);
      event.request.url = `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      event.request.url = '[REDACTED_URL]';
    }
  }

  // Sanitize exception values to strip local file paths and filenames
  if (event.exception && event.exception.values) {
    for (const val of event.exception.values) {
      if (val.value) {
        val.value = val.value
          .replace(/[A-Z]:\\[^\s]+\.(mp4|mov|webm|avi|mkv|jpg|png|gif|capproj)/gi, '[REDACTED_PATH]')
          .replace(/\/(Users|home|var|tmp)\/[^\s]+\.(mp4|mov|webm|avi|mkv|jpg|png|gif|capproj)/gi, '[REDACTED_PATH]');
      }
    }
  }

  return event;
}

/**
 * Compute percentiles (p50, p95) from an array of numbers.
 */
function calculatePercentiles(values: number[]): PercentileResult {
  if (values.length === 0) {
    return { p50: 0, p95: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));

  return {
    p50: Math.round(sorted[p50Index]),
    p95: Math.round(sorted[p95Index]),
    count: sorted.length
  };
}

/**
 * Computes aggregated metrics for the Internal Telemetry Dashboard.
 */
export function computeTelemetryMetrics(eventList?: TelemetryEvent[]): TelemetryMetrics {
  const events = eventList || getStoredTelemetryEvents();

  let exportTotal = 0;
  let exportSuccess = 0;
  let exportFailed = 0;

  const duration720p: number[] = [];
  const duration1080p: number[] = [];
  const duration4k: number[] = [];

  const errorCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};

  let webCodecsSupported = 0;
  let webCodecsUnsupported = 0;

  let onboardingStarted = 0;
  let onboardingCompleted = 0;

  for (const ev of events) {
    // Browser distribution
    if (ev.browser) {
      browserCounts[ev.browser] = (browserCounts[ev.browser] || 0) + 1;
    }
    // OS distribution
    if (ev.os) {
      osCounts[ev.os] = (osCounts[ev.os] || 0) + 1;
    }
    // WebCodecs hardware capability
    if (ev.hasWebCodecs) {
      webCodecsSupported++;
    } else {
      webCodecsUnsupported++;
    }

    if (ev.name === 'export_started') {
      exportTotal++;
    } else if (ev.name === 'export_success') {
      exportSuccess++;
      const res = ev.data?.resolution || '1080p';
      const durationMs = Number(ev.data?.export_duration_ms) || 0;

      if (durationMs > 0) {
        if (res.includes('720')) duration720p.push(durationMs);
        else if (res.includes('4k') || res.includes('4K')) duration4k.push(durationMs);
        else duration1080p.push(durationMs);
      }
    } else if (ev.name === 'export_failed') {
      exportFailed++;
      const code = ev.data?.error_code || 'EXPORT_ERROR';
      errorCounts[code] = (errorCounts[code] || 0) + 1;
    } else if (ev.name === 'app_error') {
      const code = ev.data?.error_code || 'APP_ERROR';
      errorCounts[code] = (errorCounts[code] || 0) + 1;
    } else if (ev.name === 'feature_used') {
      const feat = ev.data?.feature_name || 'unknown_feature';
      featureCounts[feat] = (featureCounts[feat] || 0) + 1;
    } else if (ev.name === 'onboarding_step') {
      if (ev.data?.action === 'view' && ev.data?.step_index === 0) {
        onboardingStarted++;
      } else if (ev.data?.action === 'complete') {
        onboardingCompleted++;
      }
    }
  }

  // If no export started event was explicitly recorded but successes/failures exist, normalize total
  const adjustedTotal = Math.max(exportTotal, exportSuccess + exportFailed);
  const successRate = adjustedTotal > 0 ? Math.round((exportSuccess / adjustedTotal) * 1000) / 10 : 100;

  // Top errors list
  const topErrors = Object.entries(errorCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top features list
  const topFeatures = Object.entries(featureCounts)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalHardware = webCodecsSupported + webCodecsUnsupported;
  const webCodecsPercentage = totalHardware > 0 ? Math.round((webCodecsSupported / totalHardware) * 1000) / 10 : 100;

  const onboardingDropped = Math.max(0, onboardingStarted - onboardingCompleted);
  const onboardingCompletionRate =
    onboardingStarted > 0 ? Math.round((onboardingCompleted / onboardingStarted) * 1000) / 10 : 100;
  const onboardingDropoffRate =
    onboardingStarted > 0 ? Math.round((onboardingDropped / onboardingStarted) * 1000) / 10 : 0;

  return {
    totalEvents: events.length,
    exportStats: {
      total: adjustedTotal,
      success: exportSuccess,
      failed: exportFailed,
      successRate
    },
    exportPercentiles: {
      '720p': calculatePercentiles(duration720p),
      '1080p': calculatePercentiles(duration1080p),
      '4k': calculatePercentiles(duration4k)
    },
    topErrors,
    browserDistribution: browserCounts,
    osDistribution: osCounts,
    webCodecsRatio: {
      supported: webCodecsSupported,
      unsupported: webCodecsUnsupported,
      percentage: webCodecsPercentage
    },
    onboardingFunnel: {
      started: onboardingStarted,
      completed: onboardingCompleted,
      dropped: onboardingDropped,
      dropoffRate: onboardingDropoffRate,
      completionRate: onboardingCompletionRate
    },
    topFeatures,
    recentEvents: events.slice(0, 25)
  };
}
