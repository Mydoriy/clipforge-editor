import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('W10-1: README.md completeness (Run, Build, Deploy, Env vars, COOP/COEP)', () => {
  const readmePath = path.join(rootDir, 'README.md');
  assert.ok(fs.existsSync(readmePath), 'README.md must exist');

  const content = fs.readFileSync(readmePath, 'utf8');
  assert.ok(content.includes('npm run dev'), 'Must document dev command');
  assert.ok(content.includes('npm run build'), 'Must document build command');
  assert.ok(content.includes('npm test'), 'Must document test command');
  assert.ok(content.includes('Cross-Origin-Opener-Policy'), 'Must document COOP header');
  assert.ok(content.includes('Cross-Origin-Embedder-Policy'), 'Must document COEP header');
  assert.ok(content.includes('.env.example'), 'Must reference .env.example');
  assert.ok(content.includes('ClipForge'), 'Must be branded as ClipForge');
});

test('W10-2: .env.example contains all key environment variables with documentation', () => {
  const envExamplePath = path.join(rootDir, '.env.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');

  const content = fs.readFileSync(envExamplePath, 'utf8');
  assert.ok(content.includes('VITE_SUPABASE_URL'), 'Must contain VITE_SUPABASE_URL');
  assert.ok(content.includes('VITE_SUPABASE_ANON_KEY'), 'Must contain VITE_SUPABASE_ANON_KEY');
  assert.ok(content.includes('VITE_SERVERLESS_AI_PROXY_URL'), 'Must contain VITE_SERVERLESS_AI_PROXY_URL');
  assert.ok(content.includes('VITE_ENABLE_SENTRY_OPT_IN'), 'Must contain VITE_ENABLE_SENTRY_OPT_IN');
});

test('W10-3: ARCHITECTURE.md contains Mermaid diagrams for compositor, workers, storage, state', () => {
  const archPath = path.join(rootDir, 'ARCHITECTURE.md');
  assert.ok(fs.existsSync(archPath), 'ARCHITECTURE.md must exist');

  const content = fs.readFileSync(archPath, 'utf8');
  assert.ok(content.includes('sequenceDiagram') || content.includes('flowchart'), 'Must contain Mermaid diagram syntax');
  assert.ok(content.includes('Compositor') || content.includes('compositor'), 'Must document video compositor pipeline');
  assert.ok(content.includes('Workers') || content.includes('Web Worker'), 'Must document workers architecture');
  assert.ok(content.includes('Dexie') || content.includes('IndexedDB'), 'Must document storage architecture');
  assert.ok(content.includes('Zustand') || content.includes('State'), 'Must document state architecture');
});

test('W10-4: CONTRIBUTING.md documents conventions, pre-commit checks and PR workflow', () => {
  const contribPath = path.join(rootDir, 'CONTRIBUTING.md');
  assert.ok(fs.existsSync(contribPath), 'CONTRIBUTING.md must exist');

  const content = fs.readFileSync(contribPath, 'utf8');
  assert.ok(content.includes('Conventional Commits'), 'Must specify conventional commits standard');
  assert.ok(content.includes('npm test'), 'Must list required tests');
  assert.ok(content.includes('check:i18n'), 'Must list i18n parity check');
  assert.ok(content.includes('Pull Request') || content.includes('PR'), 'Must outline PR process');
});

test('W10-5: USER_GUIDE.md is bilingual (Vietnamese & English)', () => {
  const guidePath = path.join(rootDir, 'USER_GUIDE.md');
  assert.ok(fs.existsSync(guidePath), 'USER_GUIDE.md must exist');

  const content = fs.readFileSync(guidePath, 'utf8');
  assert.ok(content.includes('PHẦN 1: HƯỚNG DẪN SỬ DỤNG') || content.includes('TIẾNG VIỆT'), 'Must have Vietnamese guide');
  assert.ok(content.includes('PART 2: END-USER GUIDE') || content.includes('ENGLISH'), 'Must have English guide');
  assert.ok(content.includes('Space') && content.includes('Ripple Delete'), 'Must explain core editing shortcuts in guide');
});

test('W10-6: Semantic versioning constants & About Modal integration', async () => {
  const { APP_VERSION, APP_NAME } = await import('../constants/version.ts');
  assert.strictEqual(APP_VERSION, '1.0.0', 'APP_VERSION must be semantic version 1.0.0');
  assert.strictEqual(APP_NAME, 'ClipForge Desktop Web', 'APP_NAME must be ClipForge Desktop Web');

  const modalsContent = fs.readFileSync(path.join(rootDir, 'src/components/Modals.tsx'), 'utf8');
  assert.ok(modalsContent.includes('{APP_VERSION}'), 'About Modal must dynamically interpolate APP_VERSION');
});

test('W10-7: RUNBOOK.md provides deploy, rollback and diagnostic interpretation matrix', () => {
  const runbookPath = path.join(rootDir, 'RUNBOOK.md');
  assert.ok(fs.existsSync(runbookPath), 'RUNBOOK.md must exist');

  const content = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(content.includes('vercel --prod'), 'Must document Vercel production deployment');
  assert.ok(content.includes('rollback'), 'Must document rollback protocol');
  assert.ok(content.includes('Root Cause Analysis') || content.includes('nguyên nhân gốc'), 'Must provide root cause analysis');
  assert.ok(content.includes('sharedArrayBuffer') && content.includes('webCodecs'), 'Must interpret key hardware flags');
});

