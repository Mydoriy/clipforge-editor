import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

test('Logo and Home navigation in Header: Immediate return to Home and autosave with ZERO confirmation alert', () => {
  const headerPath = path.join(rootDir, 'src', 'components', 'Header.tsx');
  assert.ok(fs.existsSync(headerPath), 'src/components/Header.tsx must exist');

  const content = fs.readFileSync(headerPath, 'utf8');

  // 1. Must NOT contain window.confirm for home navigation
  assert.equal(
    content.includes('window.confirm'),
    false,
    'Header.tsx must not contain window.confirm blocking dialog when navigating home'
  );
  assert.equal(
    content.includes('Quay về trang chủ? Mọi thay đổi'),
    false,
    'The old confirmation message must be completely removed'
  );

  // 2. Must automatically save project in handleHomeNavigation
  assert.ok(
    content.includes('db.projects.update'),
    'handleHomeNavigation must update db.projects before navigating'
  );
  assert.ok(
    content.includes('markCleanExit'),
    'handleHomeNavigation must call markCleanExit to prevent dirty crash flag'
  );

  // 3. Must immediately navigate to /
  assert.ok(
    content.includes("navigate('/')"),
    "handleHomeNavigation must call navigate('/') immediately"
  );

  // 4. Logo component has onClick passed in editor mode
  assert.ok(
    content.includes('onClick={isEditor ? handleHomeNavigation : undefined}'),
    'Logo must be wired to handleHomeNavigation in editor'
  );
});

