export function base64Decode(s: string): Uint8Array {
  const binString = atob(s);
  const len = binString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

export function base64Encode(buffer: Uint8Array | string): string {
  if (typeof buffer === "string") {
    buffer = new TextEncoder().encode(buffer);
  }
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

export function base64EncodedDataUrl(
  mimeType: string,
  buffer: Uint8Array,
): string {
  return `data:${mimeType};base64,${base64Encode(buffer)}`;
}

export function base64DecodeDataUrl(dataUrl: string): Uint8Array {
  const b64Encoded = dataUrl.split(",", 2)[1];
  return base64Decode(b64Encoded);
}

/**
 * Perform sha256 hash using the browser's crypto APIs
 * Note: this will only work over HTTPS
 * @param message
 */
export async function hashSHA256(
  message: string | Uint8Array,
): Promise<string> {
  // Transform the string into an ArrayBuffer
  const encoder = new TextEncoder();
  const data: Uint8Array =
    typeof message === "string" ? encoder.encode(message) : message;

  if (globalThis.crypto?.subtle) {
    // Generate the hash using native Web Crypto when available.
    const hashBuffer = await globalThis.crypto.subtle.digest(
      "SHA-256",
      data as BufferSource,
    );
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  // Browser secure contexts expose crypto.subtle; plain LAN HTTP does not.
  // Keep hashing available for non-encryption use cases such as DB names and
  // Atrium source-fidelity digests. Encryption still requires Web Crypto.
  return bytesToHex(sha256Fallback(data));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sha256Fallback(message: Uint8Array): Uint8Array {
  const hash = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);
  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bitLength = message.length * 8;
  const paddedLength = (message.length + 9 + 63) & ~63;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  for (let i = 0; i < hash.length; i++) {
    outputView.setUint32(i * 4, hash[i]);
  }
  return output;
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * To avoid database clashes based on space folder path name, base URLs and encryption keys we derive
 * a database name from a hash of all these combined together
 */
export async function deriveDbName(
  type: "data" | "files",
  spaceFolderPath: string,
  baseURI: string,
  encryptionKey?: CryptoKey,
): Promise<string> {
  let keyPart = "";
  if (encryptionKey) {
    keyPart = await exportKey(encryptionKey);
  }
  const spaceHash = await hashSHA256(
    `${spaceFolderPath}:${baseURI}:${keyPart}`,
  );
  return `sb_${type}_${spaceHash}`;
}

// Fixed counter for AES-CTR all zeroes, for determinism
const fixedCounter = new Uint8Array(16);

export async function encryptStringDeterministic(
  key: CryptoKey,
  clearText: string,
): Promise<string> {
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-CTR", counter: fixedCounter, length: fixedCounter.length * 8 },
    key,
    new TextEncoder().encode(clearText),
  );
  return base64Encode(new Uint8Array(encrypted));
}

export async function decryptStringDeterministic(
  key: CryptoKey,
  cipherText: string,
): Promise<string> {
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-CTR", counter: fixedCounter, length: fixedCounter.length * 8 },
    key,
    base64Decode(cipherText) as BufferSource,
  );
  return new TextDecoder().decode(decrypted);
}

// Encrypt using AES-GCM with random IV; output = IV + ciphertext
export async function encryptAesGcm(
  key: CryptoKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data as BufferSource,
  );
  const encrypted = new Uint8Array(encryptedBuffer);

  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.length);
  result.set(iv, 0);
  result.set(encrypted, iv.length);
  return result;
}

// Decrypt using AES-GCM assuming input format IV + ciphertext
export async function decryptAesGcm(
  key: CryptoKey,
  encryptedData: Uint8Array,
): Promise<Uint8Array> {
  const iv = encryptedData.slice(0, 12); // extract IV (first 12 bytes)
  const ciphertext = encryptedData.slice(12);
  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new Uint8Array(decryptedBuffer);
}

export async function deriveCTRKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  // Encode password to ArrayBuffer
  const passwordBytes = new TextEncoder().encode(password);

  // Import password as a CryptoKey
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-CTR",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"],
  );
}

export function importKey(b64EncodedKey: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    base64Decode(b64EncodedKey) as BufferSource,
    { name: "AES-CTR" },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKey(ctrKey: CryptoKey): Promise<string> {
  const key = await globalThis.crypto.subtle.exportKey("raw", ctrKey);
  return base64Encode(new Uint8Array(key));
}

export async function deriveGCMKeyFromCTR(
  ctrKey: CryptoKey,
): Promise<CryptoKey> {
  const rawKey = await globalThis.crypto.subtle.exportKey("raw", ctrKey);
  return globalThis.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
}
