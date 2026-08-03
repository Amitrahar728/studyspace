/**
 * End-to-End (E2E) Encryption helper utilizing standard Web Crypto API (RSA-OAEP + AES-GCM)
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Retrieves or generates an RSA-OAEP 2048-bit key pair for a given user ID.
 * Returns the base64-encoded SPKI public key.
 */
export async function getOrGenerateKeyPair(userId: string): Promise<string> {
  const privateKeyStorageKey = `e2e_private_key_${userId}`;
  const publicKeyStorageKey = `e2e_public_key_${userId}`;

  const existingPrivateKeyJwk = localStorage.getItem(privateKeyStorageKey);
  const existingPublicKeySpki = localStorage.getItem(publicKeyStorageKey);

  if (existingPrivateKeyJwk && existingPublicKeySpki) {
    return existingPublicKeySpki;
  }

  // Generate new RSA-OAEP keypair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  // Export public key as SPKI Base64
  const spkiBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(spkiBuffer);

  // Export private key as JWK JSON string
  const jwkPrivateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyJwkString = JSON.stringify(jwkPrivateKey);

  localStorage.setItem(publicKeyStorageKey, publicKeyBase64);
  localStorage.setItem(privateKeyStorageKey, privateKeyJwkString);

  return publicKeyBase64;
}

/**
 * Loads the user's RSA private CryptoKey from localStorage.
 */
export async function getPrivateKey(userId: string): Promise<CryptoKey | null> {
  const privateKeyStorageKey = `e2e_private_key_${userId}`;
  const privateKeyJwkString = localStorage.getItem(privateKeyStorageKey);
  if (!privateKeyJwkString) return null;

  const jwk = JSON.parse(privateKeyJwkString);
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/**
 * Imports an RSA SPKI base64 public key into a CryptoKey.
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(spkiBase64);
  return window.crypto.subtle.importKey(
    "spki",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export interface EncryptedPayloadObject {
  ciphertext: string;
  iv: string;
  keys: Record<string, string>; // userId -> encryptedAesKey (base64)
}

/**
 * Encrypts a message using AES-GCM-256.
 * The AES key is encrypted with both recipient's and sender's RSA public keys.
 */
export async function encryptPayload({
  plaintext,
  senderId,
  senderPublicKeyBase64,
  recipientId,
  recipientPublicKeyBase64,
}: {
  plaintext: string;
  senderId: string;
  senderPublicKeyBase64: string;
  recipientId: string;
  recipientPublicKeyBase64: string;
}): Promise<string> {
  // 1. Generate AES-GCM 256 key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt plaintext message with AES-GCM
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(plaintext)
  );

  // Export raw AES key bytes
  const rawAesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);

  // 3. Import public keys and encrypt AES key for recipient & sender
  const recipientCryptoKey = await importPublicKey(recipientPublicKeyBase64);
  const senderCryptoKey = await importPublicKey(senderPublicKeyBase64);

  const encKeyRecipientBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientCryptoKey,
    rawAesKeyBuffer
  );

  const encKeySenderBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderCryptoKey,
    rawAesKeyBuffer
  );

  const payload: EncryptedPayloadObject = {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    keys: {
      [recipientId]: arrayBufferToBase64(encKeyRecipientBuffer),
      [senderId]: arrayBufferToBase64(encKeySenderBuffer),
    },
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts an encrypted payload JSON string using the current user's private key.
 */
export async function decryptPayload(
  encryptedPayloadStr: string,
  userId: string
): Promise<string> {
  try {
    const payload: EncryptedPayloadObject = JSON.parse(encryptedPayloadStr);
    const privateKey = await getPrivateKey(userId);

    if (!privateKey) {
      return "[Decryption failed: Private key missing on this device]";
    }

    const encryptedAesKeyBase64 = payload.keys?.[userId];
    if (!encryptedAesKeyBase64) {
      return "[Decryption failed: Key not available for user]";
    }

    // 1. Decrypt AES key with user's RSA private key
    const encKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encKeyBuffer
    );

    // 2. Import raw AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKeyBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // 3. Decrypt ciphertext with AES key + IV
    const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);
    const ivBuffer = base64ToArrayBuffer(payload.iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      aesKey,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Payload decryption error:", err);
    return "[Encrypted Message - Key Mismatch]";
  }
}
