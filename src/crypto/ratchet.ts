import { base64ToUint8Array, uint8ArrayToBase64 } from "./keys";

export interface EncryptedEnvelope {
  cipherText: string; // Base64
  iv: string;         // Base64
  tag: string;        // Base64
}

// Derive a 256-bit Master Encryption Key (MEK) from a passphrase and a salt using PBKDF2
export async function deriveMasterKey(passphrase: string, saltHex: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const passphraseBytes = enc.encode(passphrase);
  const saltBytes = enc.encode(saltHex);

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const rawKey = await window.crypto.subtle.exportKey("raw", derivedKey);
  return new Uint8Array(rawKey);
}

// Encrypt a plaintext string using a 256-bit AES-GCM key
export async function encryptPayload(plaintext: string, keyBytes: Uint8Array): Promise<EncryptedEnvelope> {
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit random IV

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    cryptoKey,
    data as any
  );

  const fullBytes = new Uint8Array(encryptedBuffer);
  const tagBytes = fullBytes.slice(fullBytes.length - 16);
  const cipherBytes = fullBytes.slice(0, fullBytes.length - 16);

  return {
    cipherText: uint8ArrayToBase64(cipherBytes),
    iv: uint8ArrayToBase64(iv),
    tag: uint8ArrayToBase64(tagBytes),
  };
}

// Decrypt an AES-GCM encrypted envelope
export async function decryptPayload(envelope: EncryptedEnvelope, keyBytes: Uint8Array): Promise<string> {
  const iv = base64ToUint8Array(envelope.iv);
  const cipherBytes = base64ToUint8Array(envelope.cipherText);
  const tagBytes = base64ToUint8Array(envelope.tag);

  // Recombine cipher and tag for native Web Crypto API
  const fullBytes = new Uint8Array(cipherBytes.length + tagBytes.length);
  fullBytes.set(cipherBytes, 0);
  fullBytes.set(tagBytes, cipherBytes.length);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    cryptoKey,
    fullBytes as any
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// Encrypt binary files (images, audio, video) using AES-256-GCM
export async function encryptFile(file: File | Blob, keyBytes: Uint8Array): Promise<{ encryptedBlob: Blob; iv: string; tag: string }> {
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    cryptoKey,
    fileBytes as any
  );

  const fullBytes = new Uint8Array(encryptedBuffer);
  const tagBytes = fullBytes.slice(fullBytes.length - 16);
  const cipherBytes = fullBytes.slice(0, fullBytes.length - 16);

  const encryptedBlob = new Blob([cipherBytes], { type: "application/octet-stream" });

  return {
    encryptedBlob,
    iv: uint8ArrayToBase64(iv),
    tag: uint8ArrayToBase64(tagBytes),
  };
}

// Decrypt binary files from arrays
export async function decryptFile(encryptedBlob: Blob, keyBytes: Uint8Array, ivBase64: string, tagBase64: string, mimeType: string): Promise<Blob> {
  const cipherBytes = new Uint8Array(await encryptedBlob.arrayBuffer());
  const iv = base64ToUint8Array(ivBase64);
  const tag = base64ToUint8Array(tagBase64);

  const fullBytes = new Uint8Array(cipherBytes.length + tag.length);
  fullBytes.set(cipherBytes, 0);
  fullBytes.set(tag, cipherBytes.length);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    cryptoKey,
    fullBytes as any
  );

  return new Blob([decryptedBuffer], { type: mimeType });
}
