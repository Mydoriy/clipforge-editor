import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size, isMaskable = false) {
  const width = size;
  const height = size;

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw scanlines: width * 4 + 1 (filter byte 0) per row
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const center = size / 2;
  const radius = size * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark theme background (#080B12)
      let r = 0x08;
      let g = 0x0b;
      let b = 0x12;
      let a = 0xff;

      // Inner icon emblem - geometric prism cutting icon
      if (dist < radius) {
        if (dx < 0 && dy < dx * 0.5 + size * 0.1) {
          // Cyan left prism facet (#1FC8DB)
          r = 0x1f;
          g = 0xc8;
          b = 0xdb;
        } else if (dx >= 0 && dy > -dx * 0.5 - size * 0.1) {
          // White/Silver right prism facet (#E2E8F0)
          r = 0xe2;
          g = 0xe8;
          b = 0xf0;
        } else if (dist < radius * 0.3) {
          // Core dark circular lens with cyan ring
          if (dist > radius * 0.22) {
            r = 0x1f;
            g = 0xc8;
            b = 0xdb;
          } else {
            r = 0x0b;
            g = 0x0f;
            b = 0x19;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 PNG
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePng(192));
// Generate 512x512 PNG
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePng(512));
// Generate Maskable 512x512 PNG
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), generatePng(512, true));

// Generate SVG vector icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#080B12"/>
  <path d="M100 160L320 80L270 300L100 380V160Z" fill="#1FC8DB"/>
  <path d="M412 352L242 432L292 212L412 132V352Z" fill="#E2E8F0"/>
  <circle cx="256" cy="256" r="48" fill="#0B0F19" stroke="#1FC8DB" stroke-width="16"/>
  <circle cx="256" cy="256" r="16" fill="#1FC8DB"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');

console.log('✅ Generated PWA icons in public/icons/: icon-192.png, icon-512.png, icon-maskable.png, icon.svg');
