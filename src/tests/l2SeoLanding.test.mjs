import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

test('L2.1: public/robots.txt exists and points to sitemap', () => {
  const robotsPath = path.join(rootDir, 'public', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
  const content = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(content.includes('User-agent: *'), 'Must allow standard user agents');
  assert.ok(content.includes('Allow: /'), 'Must allow crawling');
  assert.ok(content.includes('Sitemap: https://clipforge-editor.vercel.app/sitemap.xml'), 'Must point to sitemap.xml');
});

test('L2.2: public/sitemap.xml exists and includes key routes', () => {
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
  const content = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/</loc>'), 'Must include root route');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/welcome</loc>'), 'Must include welcome landing page');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/templates</loc>'), 'Must include templates');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/library</loc>'), 'Must include library');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/terms</loc>'), 'Must include terms');
  assert.ok(content.includes('<loc>https://clipforge-editor.vercel.app/privacy</loc>'), 'Must include privacy');
});

test('L2.3: index.html has complete SEO meta, hreflang, OpenGraph, Twitter and JSON-LD SoftwareApplication', () => {
  const indexPath = path.join(rootDir, 'index.html');
  assert.ok(fs.existsSync(indexPath), 'index.html must exist');
  const content = fs.readFileSync(indexPath, 'utf8');

  // Title & keywords
  assert.ok(content.includes('chỉnh sửa video online không cần đăng nhập'), 'Must include primary keyword phrase in title/description');
  assert.ok(content.includes('cắt ghép video trên trình duyệt miễn phí'), 'Must include secondary keyword phrase');

  // Canonical & hreflang
  assert.ok(content.includes('rel="canonical"'), 'Must have canonical link tag');
  assert.ok(content.includes('hreflang="vi"'), 'Must have vi hreflang tag');
  assert.ok(content.includes('hreflang="en"'), 'Must have en hreflang tag');
  assert.ok(content.includes('hreflang="x-default"'), 'Must have x-default hreflang tag');

  // Open Graph & Twitter
  assert.ok(content.includes('property="og:title"'), 'Must have og:title');
  assert.ok(content.includes('property="og:description"'), 'Must have og:description');
  assert.ok(content.includes('property="og:image"'), 'Must have og:image');
  assert.ok(content.includes('name="twitter:card" content="summary_large_image"'), 'Must have twitter:card');

  // JSON-LD SoftwareApplication
  assert.ok(content.includes('application/ld+json'), 'Must contain ld+json script tag');
  assert.ok(content.includes('"@type": "SoftwareApplication"'), 'Must define SoftwareApplication');
  assert.ok(content.includes('"price": "0"'), 'Must declare free pricing');
});

test('L2.4: Welcome.tsx contains all required sections and disclaimer', () => {
  const welcomePath = path.join(rootDir, 'src', 'pages', 'Welcome.tsx');
  assert.ok(fs.existsSync(welcomePath), 'src/pages/Welcome.tsx must exist');
  const content = fs.readFileSync(welcomePath, 'utf8');

  // Hero section & primary call to action
  assert.ok(content.includes('Chỉnh sửa video online'), 'Must have hero title');
  assert.ok(content.includes('không cần đăng nhập'), 'Must highlight no-login in hero');
  assert.ok(content.includes('Mở Editor ngay'), 'Must have CTA button');

  // Local-first vs Cloud comparison table
  assert.ok(
    content.includes('Chạy hoàn toàn trên trình duyệt, video không bị tải lên server'),
    'Must have comparison heading required by spec'
  );
  assert.ok(content.includes('Web Editor truyền thống (Cloud-based)'), 'Must compare with cloud web editors');

  // Browser compatibility
  assert.ok(content.includes('Tương thích') || content.includes('Google Chrome'), 'Must list browser compatibility');
  assert.ok(content.includes('Microsoft Edge'), 'Must support Edge');
  assert.ok(content.includes('Apple Safari'), 'Must support Safari');
  assert.ok(content.includes('Mozilla Firefox'), 'Must support Firefox');

  // FAQ
  assert.ok(content.includes('FAQ') || content.includes('Câu hỏi thường gặp'), 'Must have FAQ section');

  // Legal non-affiliation disclaimer
  assert.ok(
    content.includes('Không liên kết với CapCut hay ByteDance') ||
    content.includes('không liên kết với CapCut hay ByteDance'),
    'Must explicitly state non-affiliation with CapCut or ByteDance'
  );
});

test('L2.5: App.tsx has route for /welcome', () => {
  const appPath = path.join(rootDir, 'src', 'App.tsx');
  const content = fs.readFileSync(appPath, 'utf8');
  assert.ok(content.includes('path="/welcome"'), 'App.tsx must define /welcome route');
  assert.ok(content.includes('Welcome'), 'App.tsx must reference Welcome component');
});

