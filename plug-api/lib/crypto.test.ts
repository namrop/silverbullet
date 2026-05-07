import { expect, test } from "vitest";
import {
  decryptAesGcm,
  decryptStringDeterministic,
  deriveCTRKeyFromPassword,
  deriveGCMKeyFromCTR,
  encryptAesGcm,
  encryptStringDeterministic,
  hashSHA256,
} from "@silverbulletmd/silverbullet/lib/crypto";

test("Crypto test", async () => {
  const salt = new Uint8Array(16); // zeroes for testing
  const ctr = await deriveCTRKeyFromPassword("12345", salt);
  const gcm = await deriveGCMKeyFromCTR(ctr);
  const text = "123";
  const encrypted = await encryptStringDeterministic(ctr, text);
  const encrypted2 = await encryptStringDeterministic(ctr, text);
  // Ensure determinism
  expect(encrypted).toEqual(encrypted2);
  const decrypted = await decryptStringDeterministic(ctr, encrypted);
  expect(decrypted).toEqual(text);

  // Now gcm
  const buffer = new Uint8Array(100).fill(32);
  const encryptedBuf = await encryptAesGcm(gcm, buffer);
  const decryptedBuf = await decryptAesGcm(gcm, encryptedBuf);
  expect(decryptedBuf).toEqual(buffer);
});

test("hashSHA256 matches known vectors with and without Web Crypto", async () => {
  expect(await hashSHA256("")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(await hashSHA256("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: undefined,
  });
  try {
    expect(await hashSHA256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  } finally {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    }
  }
});
