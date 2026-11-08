import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Vibrant Imagery: Homepage cards and hero banner include high-quality, content-relevant images', () => {
  const rootDir = process.cwd();
  const homePath = path.join(rootDir, 'src', 'pages', 'Home.tsx');
  assert.ok(fs.existsSync(homePath), 'src/pages/Home.tsx must exist');
  const content = fs.readFileSync(homePath, 'utf8');

  // 1. Hero banner contains background image
  assert.ok(
    content.includes('photo-1574717024653-61fd2cf4d44d'),
    'Hero banner must include cinematic studio background image'
  );

  // 2. 4 Quick Tools cards contain relevant images
  assert.ok(
    content.includes('photo-1618005182384-a83a8bd57fbe'),
    'Tạo ảnh AI (AI Image) card must include vibrant 3D artwork image'
  );
  assert.ok(
    content.includes('photo-1507525428034-b723cf961d3e'),
    'Kéo dài video (Extend Video) card must include cinematic slow motion image'
  );
  assert.ok(
    content.includes('photo-1579783900882-c0d3dad7b119'),
    'AI chỉnh sửa (AI Edit) card must include creative editing art image'
  );
  assert.ok(
    content.includes('photo-1550751827-4bd374c3f58b'),
    'Nâng chất lượng (Enhance Quality) card must include high-definition clarity image'
  );

  // 3. 4 Creative Suite cards contain relevant images
  assert.ok(
    content.includes('photo-1492691527719-9d1e07e534b4'),
    'Video Studio card must include camera/studio shooting image'
  );
  assert.ok(
    content.includes('photo-1541701494587-cb58502866ab'),
    'Design Studio card must include graphic design / art canvas image'
  );
  assert.ok(
    content.includes('photo-1505740420928-5e560c06d30e'),
    'Tạo quảng cáo AI card must include commercial product image'
  );
  assert.ok(
    content.includes('photo-1517838277536-f5f99be501cd'),
    'Video dài thành Shorts card must include viral action/sport creator image'
  );

  // 4. Badges and glassmorphism styling
  assert.ok(content.includes('AI 4K'), 'Must feature AI 4K badge');
  assert.ok(content.includes('Motion AI'), 'Must feature Motion AI badge');
  assert.ok(content.includes('Smart Cut'), 'Must feature Smart Cut badge');
  assert.ok(content.includes('HD HDR'), 'Must feature HD HDR badge');
  assert.ok(content.includes('Seedance 2.5'), 'Must feature Seedance 2.5 badge');
  assert.ok(content.includes('Canvas 9:16'), 'Must feature Canvas 9:16 badge');
  assert.ok(content.includes('Viral Ads'), 'Must feature Viral Ads badge');
  assert.ok(content.includes('Auto Shorts'), 'Must feature Auto Shorts badge');
});

