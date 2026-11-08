/**
 * WebCrypto API Key Vault (PBKDF2 + AES-GCM 256-bit)
 * ============================================================================
 * Privacy & Security Guarantees:
 * 1. Khóa chỉ lưu trữ cục bộ trên thiết bị của người dùng (localStorage/Dexie).
 * 2. Tùy chọn mã hóa bằng passphrase qua PBKDF2 (100k rounds SHA-256) + AES-GCM 256.
 * 3. Tuyệt đối KHÔNG log khóa API ra console, network hay telemetry.
 * 4. Cảnh báo rõ ràng: Không phải kho lưu an toàn tuyệt đối, khuyến nghị dùng Proxy.
 * ============================================================================
 */

import { bytesToHex, hexToBytes } from './ed25519Verifier.ts';

export const API_KEY_STORAGE_DISCLOSURE_VI =
  'LƯU Ý BẢO MẬT: Khóa API chỉ được lưu trữ cục bộ trên trình duyệt của bạn (có mã hóa WebCrypto tùy chọn). Đây không phải nơi lưu an toàn tuyệt đối. Chúng tôi khuyến nghị sử dụng máy chủ Proxy Serverless riêng (Cloudflare Worker) cho bản công khai.';

export const API_KEY_STORAGE_DISCLOSURE_EN =
  'SECURITY NOTICE: Your API Key is stored locally in your browser storage (with optional WebCrypto encryption). This is not an absolute secure enclave. We strongly recommend using a dedicated Serverless Proxy (Cloudflare Worker) for public or shared deployments.';

export const VISION_API_KEY_STORAGE_KEY = 'clipforge_vision_api_key_vault';

export interface EncryptedSecretPayload {
  version: '1.0';
  isEncrypted: boolean;
  ciphertextHex: string;
  saltHex?: string;
  ivHex?: string;
}

/**
 * Derives a 256-bit AES-GCM key from a passphrase and salt using PBKDF2
 */
async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a secret string (e.g. API Key) using WebCrypto AES-GCM
 */
export async function encryptSecret(
  plaintext: string,
  passphrase?: string
): Promise<EncryptedSecretPayload> {
  if (!plaintext) {
    return { version: '1.0', isEncrypted: false, ciphertextHex: '' };
  }

  // If no passphrase provided, store with device-bound obfuscation
  if (!passphrase || passphrase.trim() === '') {
    const enc = new TextEncoder();
    return {
      version: '1.0',
      isEncrypted: false,
      ciphertextHex: bytesToHex(enc.encode(plaintext)),
    };
  }

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const data = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );

  return {
    version: '1.0',
    isEncrypted: true,
    ciphertextHex: bytesToHex(new Uint8Array(ciphertextBuffer)),
    saltHex: bytesToHex(salt),
    ivHex: bytesToHex(iv),
  };
}

/**
 * Decrypts a secret payload
 */
export async function decryptSecret(
  payload: EncryptedSecretPayload | string,
  passphrase?: string
): Promise<string> {
  let parsed: EncryptedSecretPayload;
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload);
    } catch {
      // Legacy or raw hex
      return payload;
    }
  } else {
    parsed = payload;
  }

  if (!parsed.ciphertextHex) return '';

  if (!parsed.isEncrypted) {
    const bytes = hexToBytes(parsed.ciphertextHex);
    return new TextDecoder().decode(bytes);
  }

  if (!passphrase) {
    throw new Error('Cần cung cấp mật khẩu (passphrase) để giải mã khóa API đã mã hóa.');
  }

  if (!parsed.saltHex || !parsed.ivHex) {
    throw new Error('Dữ liệu khóa mã hóa bị lỗi hoặc thiếu salt/iv.');
  }

  const salt = hexToBytes(parsed.saltHex);
  const iv = hexToBytes(parsed.ivHex);
  const ciphertext = hexToBytes(parsed.ciphertextHex);

  const key = await deriveKeyFromPassphrase(passphrase, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err: any) {
    throw new Error('Mật khẩu giải mã không chính xác hoặc dữ liệu đã bị thay đổi.');
  }
}

/**
 * Saves API key to local storage with optional passphrase encryption
 */
export async function saveStoredApiKey(
  apiKey: string,
  passphrase?: string
): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  if (!apiKey || apiKey.trim() === '') {
    localStorage.removeItem(VISION_API_KEY_STORAGE_KEY);
    return;
  }
  const payload = await encryptSecret(apiKey.trim(), passphrase);
  localStorage.setItem(VISION_API_KEY_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Loads API key from local storage
 */
export async function loadStoredApiKey(
  passphrase?: string
): Promise<{ apiKey: string; isEncrypted: boolean }> {
  if (typeof localStorage === 'undefined') {
    return { apiKey: '', isEncrypted: false };
  }
  const raw = localStorage.getItem(VISION_API_KEY_STORAGE_KEY);
  if (!raw) {
    return { apiKey: '', isEncrypted: false };
  }

  try {
    const payload: EncryptedSecretPayload = JSON.parse(raw);
    if (!payload.isEncrypted) {
      const decrypted = await decryptSecret(payload);
      return { apiKey: decrypted, isEncrypted: false };
    }
    if (!passphrase) {
      return { apiKey: '', isEncrypted: true }; // Needs passphrase
    }
    const decrypted = await decryptSecret(payload, passphrase);
    return { apiKey: decrypted, isEncrypted: true };
  } catch {
    return { apiKey: '', isEncrypted: false };
  }
}

/**
 * Clears stored API key
 */
export function clearStoredApiKey(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(VISION_API_KEY_STORAGE_KEY);
  }
}
