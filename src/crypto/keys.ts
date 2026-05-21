import { x25519 } from '@noble/curves/ed25519.js';

export interface KeyPair {
  publicKey: string;  // Base64 encoded
  privateKey: string; // Base64 encoded
}

// Convert a Uint8Array to a Base64 string
export function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

// Convert a Base64 string to a Uint8Array
export function base64ToUint8Array(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Generate a new high-entropy X25519 Curve25519 key pair
export function generateX25519KeyPair(): KeyPair {
  const privateKeyBytes = x25519.utils.randomSecretKey();
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);

  return {
    publicKey: uint8ArrayToBase64(publicKeyBytes),
    privateKey: uint8ArrayToBase64(privateKeyBytes),
  };
}

// Compute the Diffie-Hellman shared secret between our private key and their public key
export function computeSharedSecret(privateKeyBase64: string, publicBase64: string): Uint8Array {
  const privKey = base64ToUint8Array(privateKeyBase64);
  const pubKey = base64ToUint8Array(publicBase64);
  return x25519.getSharedSecret(privKey, pubKey);
}
