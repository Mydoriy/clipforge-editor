/**
 * Ed25519 Cryptographic Signature Verification & Key Rotation
 * ============================================================================
 * Standard W3C Web Cryptography API with RFC 8032 compliance.
 * Verifies official registry packages and prevents tampered/spoofed assets.
 * ============================================================================
 */

export interface RegistryPublicKey {
  id: string;
  publicKeyHex: string; // 32-byte Ed25519 public key in hexadecimal (64 chars)
  validFrom: string; // ISO timestamp
  validTo?: string; // Optional expiry timestamp for rotation
  description: string;
}

/**
 * Embedded Official Public Keys with Rotation Schedule
 * Official packages signed by ClipForge Core Team MUST match one of these keys.
 */
export const OFFICIAL_REGISTRY_KEYS: RegistryPublicKey[] = [
  {
    id: 'clipforge_ed25519_2026_primary',
    publicKeyHex: '10108fe56821894d7536e1e480176777fe92d1028b96bcdf85f1dfae1140f642',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2027-01-01T00:00:00Z',
    description: 'ClipForge Core Primary Signer 2026',
  },
  {
    id: 'clipforge_ed25519_2026_rotation',
    publicKeyHex: '4a2f8fe56821894d7536e1e480176777fe92d1028b96bcdf85f1dfae1140f699',
    validFrom: '2026-06-01T00:00:00Z',
    validTo: '2028-01-01T00:00:00Z',
    description: 'ClipForge Key Rotation Standby 2026-2028',
  },
];

// Helper: Hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hexadecimal string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Helper: Uint8Array to Hex string
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes deterministic canonical representation of an object for signing
 */
export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  // Exclude non-payload transient properties like signature itself
  const keys = Object.keys(obj)
    .filter((k) => k !== 'signature' && k !== 'isInstalled' && k !== 'installedVersion' && k !== 'hasUpdate')
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

/**
 * Computes SHA-256 hash of bytes or string
 */
export async function computeSha256(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Verifies an Ed25519 signature using W3C WebCrypto API
 */
export async function verifyEd25519Signature(
  data: Uint8Array | string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const rawData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const pubBytes = hexToBytes(publicKeyHex);
    const sigBytes = hexToBytes(signatureHex);

    if (pubBytes.length !== 32 || sigBytes.length !== 64) {
      return false;
    }

    // Modern WebCrypto natively supports Ed25519 in Node 18+ and modern browsers
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      pubBytes as unknown as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      cryptoKey,
      sigBytes as unknown as BufferSource,
      rawData as unknown as BufferSource
    );
  } catch (err) {
    // If WebCrypto Ed25519 throws an error or is unsupported
    console.warn('[Ed25519Verifier] WebCrypto verification failed:', err);
    return false;
  }
}

/**
 * Signs data using a 32-byte Ed25519 raw private key in hexadecimal
 */
export async function signEd25519(
  data: Uint8Array | string,
  privateKeyHex: string
): Promise<string> {
  const rawData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const rawPrivBytes = hexToBytes(privateKeyHex);
  if (rawPrivBytes.length !== 32) {
    throw new Error('Ed25519 private key must be 32 bytes (64 hex characters)');
  }

  // Standard PKCS#8 DER envelope prefix for Ed25519 (16 bytes)
  const pkcs8Prefix = hexToBytes('302e020100300506032b657004220420');
  const pkcs8Bytes = new Uint8Array(pkcs8Prefix.length + rawPrivBytes.length);
  pkcs8Bytes.set(pkcs8Prefix, 0);
  pkcs8Bytes.set(rawPrivBytes, pkcs8Prefix.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes as unknown as BufferSource,
    { name: 'Ed25519' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' },
    cryptoKey,
    rawData as unknown as BufferSource
  );

  return bytesToHex(new Uint8Array(sigBuffer));
}

/**
 * Verifies whether a package has a valid official Ed25519 signature from ClipForge Core
 */
export async function verifyOfficialPackage(
  pkgPayload: any,
  signatureHex?: string
): Promise<{ verified: boolean; signerKeyId?: string; error?: string }> {
  const sig = signatureHex || pkgPayload.signature;
  if (!sig) {
    return { verified: false, error: 'Thiếu chữ ký số Ed25519' };
  }

  // Canonical payload bytes
  const canonicalStr = canonicalStringify(pkgPayload);
  const dataBytes = new TextEncoder().encode(canonicalStr);

  const now = new Date().toISOString();

  // Test against active public keys in rotation list
  for (const keyDef of OFFICIAL_REGISTRY_KEYS) {
    // Key validity check
    if (keyDef.validFrom > now) continue;
    if (keyDef.validTo && keyDef.validTo < now) continue;

    const isValid = await verifyEd25519Signature(dataBytes, sig, keyDef.publicKeyHex);
    if (isValid) {
      return { verified: true, signerKeyId: keyDef.id };
    }
  }

  return { verified: false, error: 'Chữ ký Ed25519 không khớp với bất kỳ khóa chính thức nào' };
}
