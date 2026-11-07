import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRO VIP Default: User account is permanently Pro VIP at highest tier with zero pricing upsells', () => {
  const rootDir = process.cwd();

  // 1. Check useEditorStore defaults isPro to true
  const storePath = path.join(rootDir, 'src', 'store', 'useEditorStore.ts');
  const storeContent = fs.readFileSync(storePath, 'utf8');
  assert.ok(
    storeContent.includes('isPro: true'),
    'useEditorStore must default isPro to true'
  );

  // 2. Check Modals.tsx has removed all pricing cards (Free 0đ, Pro Tháng 199.000đ, Pro Năm 99.000đ)
  const modalsPath = path.join(rootDir, 'src', 'components', 'Modals.tsx');
  const modalsContent = fs.readFileSync(modalsPath, 'utf8');
  assert.ok(!modalsContent.includes('199.000'), 'Must not contain 199.000 pricing');
  assert.ok(!modalsContent.includes('99.000'), 'Must not contain 99.000 pricing');
  assert.ok(!modalsContent.includes('Try Pro free'), 'Must not contain Try Pro free button');
  assert.ok(!modalsContent.includes('Nâng cấp CapCut Web Pro'), 'Must not contain old upgrade sales title');
  assert.ok(
    modalsContent.includes('Tài khoản PRO VIP Vĩnh Viễn') || modalsContent.includes('VIP Unlimited'),
    'Modals.tsx must display VIP Unlimited privileges instead of pricing packages'
  );

  // 3. Header displays PRO VIP badge with zero upsell prompt
  const headerPath = path.join(rootDir, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert.ok(headerContent.includes('PRO VIP'), 'Header must display PRO VIP badge');
  assert.ok(!headerContent.includes('Unlock Pro'), 'Header must not show Unlock Pro upsell');

  // 4. Sidebar displays active PRO VIP badge in both guest and signed-in states
  const sidebarPath = path.join(rootDir, 'src', 'components', 'Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert.ok(sidebarContent.includes('PRO VIP'), 'Sidebar must display PRO VIP badge');
  assert.ok(!sidebarContent.includes('{t.joinPro}'), 'Sidebar must not show joinPro upsell button');
});
