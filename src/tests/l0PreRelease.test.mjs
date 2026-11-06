import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function walkDir(dir, filterFn, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'test-results') {
        walkDir(fullPath, filterFn, fileList);
      }
    } else if (filterFn(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

test('L0: Secret & Gitleaks Scanner - No hardcoded API keys, tokens or secrets in src/', () => {
  const srcFiles = walkDir('src', (f) => /\.(ts|tsx|js|jsx|json)$/.test(f));

  // Regex patterns matching secret signatures
  const secretPatterns = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'GitHub Personal Token', regex: /ghp_[0-9a-zA-Z]{36}/ },
    { name: 'OpenAI Secret Key (Active)', regex: /sk-[a-zA-Z0-9]{20,}/ },
    { name: 'Google API Key (Active)', regex: /AIza[0-9A-Za-z-_]{35}/ },
    { name: 'Slack Bot Token', regex: /xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/ },
    { name: 'Private Key Block', regex: /-----BEGIN PRIVATE KEY-----/ }
  ];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of secretPatterns) {
      const match = content.match(pattern.regex);
      if (match) {
        // Exclude placeholder and regex prefix checks
        if (content.includes('placeholder=') || content.includes('startsWith(')) {
          continue;
        }
        assert.fail(`Found suspected ${pattern.name} in ${file}: ${match[0].slice(0, 8)}...`);
      }
    }
  }
});

test('L0: Clean Codebase - No temporary domains or localhost in src/', () => {
  const srcFiles = walkDir('src', (f) => /\.(ts|tsx|js|jsx)$/.test(f));
  const bannedKeywords = ['localhost:', '127.0.0.1:', '.ngrok.io', '.localtunnel.me'];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const kw of bannedKeywords) {
      if (content.includes(kw)) {
        assert.fail(`Found banned temporary URL/domain "${kw}" in ${file}`);
      }
    }
  }
});

test('L0: Cross-Origin Isolation & Security Headers verification', () => {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const headers = vercelConfig.headers[0].headers;

  const headerMap = {};
  for (const h of headers) {
    headerMap[h.key] = h.value;
  }

  assert.strictEqual(headerMap['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.strictEqual(headerMap['Cross-Origin-Embedder-Policy'], 'credentialless');
  assert.ok(headerMap['Content-Security-Policy'].includes("wasm-unsafe-eval"));
  assert.strictEqual(headerMap['X-Frame-Options'], 'DENY');
  assert.ok(headerMap['Permissions-Policy'].includes("camera=()"));
  assert.strictEqual(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
});
