import { hashSHA256 } from "../plug-api/lib/crypto.ts";

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

async function sha256(bytes: Uint8Array): Promise<string> {
  return hashSHA256(bytes);
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
