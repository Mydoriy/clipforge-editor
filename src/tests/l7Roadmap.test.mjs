import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

test('L7.1: ROADMAP_V1_1.md exists and is grounded in BETA_REPORT.md & telemetry', () => {
  const roadmapPath = path.join(rootDir, 'ROADMAP_V1_1.md');
  assert.ok(fs.existsSync(roadmapPath), 'ROADMAP_V1_1.md must exist');

  const content = fs.readFileSync(roadmapPath, 'utf8');

  // Verify grounding in Beta Report & Telemetry
  assert.ok(content.includes('BETA_REPORT.md'), 'Must reference BETA_REPORT.md');
  assert.ok(content.includes('p50') || content.includes('p95'), 'Must reference telemetry p50/p95 latency metrics');
  assert.ok(content.includes('95%'), 'Must reference telemetry export success rate');
});

test('L7.2: ROADMAP_V1_1.md covers 3 required groups with reasons, estimates, and risks', () => {
  const roadmapPath = path.join(rootDir, 'ROADMAP_V1_1.md');
  const content = fs.readFileSync(roadmapPath, 'utf8');

  // Verify Group 1: Bug fixes / Stability
  assert.ok(content.includes('SỬA LỖI') || content.includes('STABILITY'), 'Must contain Group 1 (Stability & Fixes)');
  assert.ok(content.includes('Watchdog') || content.includes('Timeout'), 'Must include GPU timeout watchdog');
  assert.ok(content.includes('Relink') || content.includes('quyền đọc tệp'), 'Must include file permission relink');

  // Verify Group 2: Most requested features
  assert.ok(content.includes('TÍNH NĂNG ĐƯỢC YÊU CẦU NHIỀU NHẤT') || content.includes('MOST REQUESTED'), 'Must contain Group 2 (Most Requested Features)');
  assert.ok(content.includes('Silence Remover') || content.includes('khoảng lặng'), 'Must include smart silence remover');
  assert.ok(content.includes('SFX') || content.includes('Kho Hiệu ứng Âm thanh'), 'Must include SFX library');
  assert.ok(content.includes('Web Share'), 'Must include Web Share API');

  // Verify Group 3: Performance optimizations
  assert.ok(content.includes('TỐI ƯU HIỆU NĂNG') || content.includes('PERFORMANCE'), 'Must contain Group 3 (Performance)');
  assert.ok(content.includes('Dedicated WebCodecs') || content.includes('Worker'), 'Must include Dedicated WebCodecs worker');
  assert.ok(content.includes('INT8') || content.includes('Whisper'), 'Must include Whisper INT8 model');
  assert.ok(content.includes('Texture') || content.includes('Pool'), 'Must include texture pool');

  // Verify each group has reason, estimate, and risk
  assert.ok(content.includes('Lý do'), 'Must state reasons for items');
  assert.ok(content.includes('Ước lượng'), 'Must state work estimates');
  assert.ok(content.includes('Rủi ro'), 'Must analyze risks for each item');
});

test('L7.3: Evaluation of Desktop app (Tauri) with FFmpeg native and GPU assessment', () => {
  const roadmapPath = path.join(rootDir, 'ROADMAP_V1_1.md');
  const content = fs.readFileSync(roadmapPath, 'utf8');

  // Verify Tauri evaluation
  assert.ok(content.includes('Tauri'), 'Must evaluate Tauri architecture');
  assert.ok(content.includes('FFmpeg') || content.includes('NVENC'), 'Must analyze native FFmpeg/GPU acceleration');
  assert.ok(content.includes('KHUYẾN NGHỊ') || content.includes('Khuyến nghị'), 'Must provide clear strategic recommendation');
  assert.ok(content.includes('ProRes') || content.includes('H.265') || content.includes('HEVC'), 'Must analyze extended codecs');
});

