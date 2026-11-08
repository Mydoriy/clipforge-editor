/**
 * CapFX ZIP Container (.capfx) Packer & Unpacker
 * ============================================================================
 * Implements standard ZIP (PKZIP 2.0) archive creation and extraction for
 * .capfx effect packages without external heavy dependencies.
 * Automatically computes and verifies SHA-256 integrity hashes for all assets.
 * ============================================================================
 */

import type { EffectPack, PackAssetMetadata } from '../types/effectPack.ts';
import { validateEffectPack } from '../types/effectPackSchema.ts';
import { validateArchiveSecurity } from '../engine/securitySandbox.ts';

// CRC-32 Lookup Table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface ZipEntry {
  path: string;
  data: Uint8Array;
  crc: number;
  size: number;
  offset?: number;
}

/**
 * Creates a valid ZIP container (.capfx) containing manifest.json and declared asset files
 */
export async function packCapfx(
  pack: EffectPack,
  extraFiles: Record<string, Uint8Array | string> = {}
): Promise<Uint8Array> {
  const entries: ZipEntry[] = [];
  const textEncoder = new TextEncoder();
  const computedAssets: PackAssetMetadata[] = [];

  // 1. Process extra asset files and calculate SHA-256 & size
  for (const [filePath, content] of Object.entries(extraFiles)) {
    const normPath = filePath.replace(/^[/\\]+/, '');
    const data = typeof content === 'string' ? textEncoder.encode(content) : content;
    const hash = await sha256Hex(data);
    computedAssets.push({
      path: normPath,
      sha256: hash,
      size: data.length,
    });

    entries.push({
      path: normPath,
      data,
      crc: crc32(data),
      size: data.length,
    });
  }

  // Update pack.assets metadata table
  const updatedPack: EffectPack = {
    ...pack,
    assets: computedAssets,
  };

  // 2. Add manifest.json as the root entry
  const manifestJson = JSON.stringify(updatedPack, null, 2);
  const manifestData = textEncoder.encode(manifestJson);
  entries.unshift({
    path: 'manifest.json',
    data: manifestData,
    crc: crc32(manifestData),
    size: manifestData.length,
  });

  // 3. Encode into PKZIP format
  const localHeaderChunks: Uint8Array[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    entry.offset = currentOffset;
    const nameBytes = textEncoder.encode(entry.path);

    // Local file header (30 bytes + name length)
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Signature
    view.setUint16(4, 20, true);         // Version needed: 2.0
    view.setUint16(6, 0, true);          // General flag: 0
    view.setUint16(8, 0, true);          // Compression: 0 (Store)
    view.setUint16(10, 0, true);         // Mod time
    view.setUint16(12, 0, true);         // Mod date
    view.setUint32(14, entry.crc, true); // CRC-32
    view.setUint32(18, entry.size, true);// Compressed size
    view.setUint32(22, entry.size, true);// Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Name length
    view.setUint16(28, 0, true);         // Extra field length
    header.set(nameBytes, 30);

    localHeaderChunks.push(header);
    localHeaderChunks.push(entry.data);
    currentOffset += header.length + entry.data.length;
  }

  const centralDirOffset = currentOffset;
  const centralDirChunks: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.path);
    // Central directory file header (46 bytes + name length)
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed
    view.setUint16(8, 0, true);          // Flags
    view.setUint16(10, 0, true);         // Compression: 0
    view.setUint16(12, 0, true);         // Mod time
    view.setUint16(14, 0, true);         // Mod date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.size, true);// Compressed size
    view.setUint32(24, entry.size, true);// Uncompressed size
    view.setUint16(28, nameBytes.length, true); // Name length
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // Comment length
    view.setUint16(34, 0, true);         // Disk start
    view.setUint16(36, 0, true);         // Internal attributes
    view.setUint32(38, 0, true);         // External attributes
    view.setUint32(42, entry.offset || 0, true); // Relative offset
    cdHeader.set(nameBytes, 46);

    centralDirChunks.push(cdHeader);
    currentOffset += cdHeader.length;
  }

  const centralDirSize = currentOffset - centralDirOffset;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // Signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Start disk
  eocdView.setUint16(8, entries.length, true);  // Entries this disk
  eocdView.setUint16(10, entries.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Central dir size
  eocdView.setUint32(16, centralDirOffset, true); // Central dir offset
  eocdView.setUint16(20, 0, true);         // Comment length

  // Combine all chunks into one Uint8Array
  const totalLength = currentOffset + eocd.length;
  const out = new Uint8Array(totalLength);
  let pos = 0;

  for (const chunk of [...localHeaderChunks, ...centralDirChunks, eocd]) {
    out.set(chunk, pos);
    pos += chunk.length;
  }

  return out;
}

/**
 * Extracts all files and manifest.json from a .capfx ZIP archive, verifying SHA-256 hashes
 */
export async function unpackCapfx(
  zipBytes: Uint8Array
): Promise<{
  pack: EffectPack;
  files: Record<string, Uint8Array>;
  integrityVerified: boolean;
}> {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const textDecoder = new TextDecoder();
  const files: Record<string, Uint8Array> = {};

  // 1. Locate End of Central Directory (EOCD)
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Tệp không phải là định dạng lưu trữ .capfx / ZIP hợp lệ (thiếu EOCD).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  // 2. Iterate Central Directory
  let cdPos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cdPos, true) !== 0x02014b50) {
      throw new Error(`Lỗi cấu trúc Central Directory tại vị trí ${cdPos}.`);
    }

    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localHeaderOffset = view.getUint32(cdPos + 42, true);

    const nameBytes = zipBytes.subarray(cdPos + 46, cdPos + 46 + nameLen);
    const fileName = textDecoder.decode(nameBytes);

    // Read file from Local Header
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      throw new Error(`Local file header hỏng cho mục: ${fileName}`);
    }

    const compression = view.getUint16(localHeaderOffset + 8, true);
    const compSize = view.getUint32(localHeaderOffset + 18, true);
    const uncompSize = view.getUint32(localHeaderOffset + 22, true);
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);

    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawData = zipBytes.subarray(dataStart, dataStart + compSize);

    if (compression === 0) {
      files[fileName] = rawData;
    } else {
      // In case deflated in external tools
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(rawData as any);
      writer.close();
      const response = new Response(ds.readable);
      const decompressed = new Uint8Array(await response.arrayBuffer());
      files[fileName] = decompressed;
    }

    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  // 3. M7 Security: Validate archive limits, path traversal, zip bombs, and whitelisted extensions
  const archiveSecurity = validateArchiveSecurity(files, zipBytes.byteLength);
  if (!archiveSecurity.safe) {
    throw new Error(`[${archiveSecurity.errorCode}] ${archiveSecurity.error}`);
  }

  // 4. Find and validate manifest.json
  const manifestData = files['manifest.json'];
  if (!manifestData) {
    throw new Error('Gói .capfx không chứa tệp cấu hình bắt buộc "manifest.json".');
  }

  const manifestStr = textDecoder.decode(manifestData);
  const parsed = JSON.parse(manifestStr);

  const validation = validateEffectPack(parsed);
  if (!validation.success || !validation.data) {
    throw new Error(`Cấu hình manifest.json không hợp lệ: ${(validation.errors || []).join(', ')}`);
  }

  const pack = validation.data;

  // 4. Verify integrity hashes against pack.assets
  let integrityVerified = true;
  for (const assetMeta of pack.assets) {
    const fileBytes = files[assetMeta.path];
    if (!fileBytes) {
      integrityVerified = false;
      console.warn(`[CapFX] Thiếu tệp asset được khai báo: ${assetMeta.path}`);
      continue;
    }
    const computedHash = await sha256Hex(fileBytes);
    if (computedHash !== assetMeta.sha256) {
      integrityVerified = false;
      console.warn(`[CapFX] Sai lệch mã SHA-256 đối với ${assetMeta.path}`);
    }
  }

  return {
    pack,
    files,
    integrityVerified,
  };
}
