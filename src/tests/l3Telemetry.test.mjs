import test from 'node:test';
import assert from 'node:assert';
import {
  getTelemetryConsent,
  setTelemetryConsent,
  isTelemetryEnabled,
  sanitizeTelemetryData,
  trackEvent,
  getStoredTelemetryEvents,
  clearStoredTelemetryEvents,
  computeTelemetryMetrics,
  sentryBeforeSend
} from '../utils/telemetry.ts';

// Mock localStorage for Node test runner
const mockStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => mockStorage.get(k) ?? null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  }
};
try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    configurable: true
  });
} catch {
  // Ignore if immutable
}

test('L3.1: Telemetry is strictly OFF by default (No opt-in yet)', () => {
  mockStorage.clear();
  assert.strictEqual(getTelemetryConsent(), 'pending', 'Consent must be pending by default');
  assert.strictEqual(isTelemetryEnabled(), false, 'Telemetry must be disabled when consent is not granted');
});

test('L3.2: Opt-in consent flow (grant & deny)', () => {
  mockStorage.clear();

  // Grant consent
  setTelemetryConsent('granted');
  assert.strictEqual(getTelemetryConsent(), 'granted');
  assert.strictEqual(isTelemetryEnabled(), true);
  assert.strictEqual(mockStorage.get('clipforge_sentry_consent'), 'true');

  // Deny consent
  setTelemetryConsent('denied');
  assert.strictEqual(getTelemetryConsent(), 'denied');
  assert.strictEqual(isTelemetryEnabled(), false);
  assert.strictEqual(mockStorage.get('clipforge_sentry_consent'), 'false');
});

test('L3.3: Strict sanitization strips filenames, paths, titles and video content', () => {
  const dirtyData = {
    name: 'secret_video.mp4',
    title: 'Top Secret Project Vlog',
    projectName: 'Private Reel 2026',
    video: 'blob:http://localhost/raw-video-bytes',
    filePath: 'C:\\Users\\Admin\\Videos\\family_holiday.mp4',
    resolution: '1080p',
    codec: 'h264',
    fps: 30,
    size_bytes_approx: 15400000,
    api_url: 'https://api.example.com/endpoint?token=secret123&user=admin'
  };

  const clean = sanitizeTelemetryData(dirtyData);

  // Forbidden keys must be completely removed
  assert.strictEqual(clean.name, undefined);
  assert.strictEqual(clean.title, undefined);
  assert.strictEqual(clean.projectName, undefined);
  assert.strictEqual(clean.video, undefined);
  assert.strictEqual(clean.filePath, undefined);

  // Safe non-PII properties must be preserved
  assert.strictEqual(clean.resolution, '1080p');
  assert.strictEqual(clean.codec, 'h264');
  assert.strictEqual(clean.fps, 30);
  assert.strictEqual(clean.size_bytes_approx, 15400000);

  // URL query params (token) must be stripped
  assert.strictEqual(clean.api_url, 'https://api.example.com/endpoint');
});

test('L3.4: Event tracking records anonymous platform metadata only when consented', () => {
  mockStorage.clear();
  clearStoredTelemetryEvents();

  // 1. Without consent, nothing is stored
  trackEvent('project_created', { aspect: '9:16', resolution: '1080p' });
  assert.strictEqual(getStoredTelemetryEvents().length, 0, 'No event should be stored without consent');

  // 2. With consent, events are safely recorded
  setTelemetryConsent('granted');
  trackEvent('project_created', { aspect: '9:16', resolution: '1080p' });

  const events = getStoredTelemetryEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].name, 'project_created');
  assert.strictEqual(events[0].browser, 'Edge');
  assert.strictEqual(events[0].os, 'Windows');
  assert.strictEqual(events[0].data.aspect, '9:16');
  assert.strictEqual(events[0].data.resolution, '1080p');
  assert.strictEqual(events[0].data.title, undefined, 'Project title must never be recorded');
});

test('L3.5: Metrics aggregation calculates export rate, p50/p95 percentiles, top errors and onboarding funnel', () => {
  const sampleEvents = [
    // Exports
    { id: '1', name: 'export_started', data: { resolution: '1080p' }, timestamp: '2026-11-07T00:00:00Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true },
    { id: '2', name: 'export_success', data: { resolution: '1080p', export_duration_ms: 5000 }, timestamp: '2026-11-07T00:00:05Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true },
    { id: '3', name: 'export_started', data: { resolution: '1080p' }, timestamp: '2026-11-07T00:01:00Z', browser: 'Edge', os: 'Windows', hasWebCodecs: true },
    { id: '4', name: 'export_success', data: { resolution: '1080p', export_duration_ms: 7000 }, timestamp: '2026-11-07T00:01:07Z', browser: 'Edge', os: 'Windows', hasWebCodecs: true },
    { id: '5', name: 'export_started', data: { resolution: '720p' }, timestamp: '2026-11-07T00:02:00Z', browser: 'Safari', os: 'Mac', hasWebCodecs: false },
    { id: '6', name: 'export_success', data: { resolution: '720p', export_duration_ms: 3000 }, timestamp: '2026-11-07T00:02:03Z', browser: 'Safari', os: 'Mac', hasWebCodecs: false },
    { id: '7', name: 'export_started', data: { resolution: '1080p' }, timestamp: '2026-11-07T00:03:00Z', browser: 'Chrome', os: 'Linux', hasWebCodecs: true },
    { id: '8', name: 'export_failed', data: { resolution: '1080p', error_code: 'OUT_OF_MEMORY' }, timestamp: '2026-11-07T00:03:01Z', browser: 'Chrome', os: 'Linux', hasWebCodecs: true },
    // Errors
    { id: '9', name: 'app_error', data: { error_code: 'WEBCODECS_CONFIG_FAILED' }, timestamp: '2026-11-07T00:04:00Z', browser: 'Firefox', os: 'Windows', hasWebCodecs: false },
    { id: '10', name: 'app_error', data: { error_code: 'OUT_OF_MEMORY' }, timestamp: '2026-11-07T00:05:00Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true },
    // Onboarding
    { id: '11', name: 'onboarding_step', data: { step_index: 0, action: 'view' }, timestamp: '2026-11-07T00:06:00Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true },
    { id: '12', name: 'onboarding_step', data: { step_index: 3, action: 'complete' }, timestamp: '2026-11-07T00:06:30Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true },
    { id: '13', name: 'onboarding_step', data: { step_index: 0, action: 'view' }, timestamp: '2026-11-07T00:07:00Z', browser: 'Safari', os: 'iOS', hasWebCodecs: false },
    // Feature
    { id: '14', name: 'feature_used', data: { feature_name: 'split_clip' }, timestamp: '2026-11-07T00:08:00Z', browser: 'Chrome', os: 'Windows', hasWebCodecs: true }
  ];

  const metrics = computeTelemetryMetrics(sampleEvents);

  // 1. Export Success Rate: 3 success out of 4 started = 75%
  assert.strictEqual(metrics.exportStats.total, 4);
  assert.strictEqual(metrics.exportStats.success, 3);
  assert.strictEqual(metrics.exportStats.failed, 1);
  assert.strictEqual(metrics.exportStats.successRate, 75);

  // 2. Percentiles
  assert.strictEqual(metrics.exportPercentiles['720p'].p50, 3000);
  assert.strictEqual(metrics.exportPercentiles['1080p'].count, 2);
  assert.ok(metrics.exportPercentiles['1080p'].p50 >= 5000);

  // 3. Top Errors: OUT_OF_MEMORY (2 times), WEBCODECS_CONFIG_FAILED (1 time)
  assert.strictEqual(metrics.topErrors[0].code, 'OUT_OF_MEMORY');
  assert.strictEqual(metrics.topErrors[0].count, 2);

  // 4. Onboarding Funnel: 2 started, 1 completed -> 50% completion, 50% dropoff
  assert.strictEqual(metrics.onboardingFunnel.started, 2);
  assert.strictEqual(metrics.onboardingFunnel.completed, 1);
  assert.strictEqual(metrics.onboardingFunnel.completionRate, 50);
  assert.strictEqual(metrics.onboardingFunnel.dropoffRate, 50);

  // 5. Hardware WebCodecs Ratio
  assert.ok(metrics.webCodecsRatio.supported > 0);
  assert.ok(metrics.webCodecsRatio.unsupported > 0);
});

test('L3.6: Sentry beforeSend hook strips local file paths and URL tokens', () => {
  const sentryEvent = {
    request: {
      url: 'https://clipforge-editor.vercel.app/editor/proj-123?auth_token=supersecret&key=123'
    },
    exception: {
      values: [
        {
          value: 'Failed to decode C:\\Users\\ACER\\Videos\\my_draft_video.mp4 with WebCodecs'
        }
      ]
    }
  };

  const scrubbed = sentryBeforeSend(sentryEvent);

  // URL query params stripped
  assert.strictEqual(scrubbed.request.url, 'https://clipforge-editor.vercel.app/editor/proj-123');

  // File path redacted in exception message
  assert.ok(!scrubbed.exception.values[0].value.includes('C:\\Users\\ACER'));
  assert.ok(!scrubbed.exception.values[0].value.includes('my_draft_video.mp4'));
  assert.ok(scrubbed.exception.values[0].value.includes('[REDACTED_PATH]'));
});
