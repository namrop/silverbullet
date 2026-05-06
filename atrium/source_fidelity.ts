export type AtriumSourceSnapshot = {
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function utf8ToBytes(source: string): Uint8Array {
  return encoder.encode(source);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function sourceBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  for (let i = 0; i < left.byteLength; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digestInput = new Uint8Array(bytes).buffer;
    return bytesToHex(
      new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", digestInput)),
    );
  }

  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(bytes).digest("hex");
}

export async function createSourceSnapshot(
  source: string | Uint8Array,
): Promise<AtriumSourceSnapshot> {
  const bytes = typeof source === "string" ? utf8ToBytes(source) : source.slice();
  return {
    bytes,
    byteLength: bytes.byteLength,
    sha256: await sha256(bytes),
  };
}
