export function base64UrlEncode(input: Uint8Array) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const withPadding =
    remainder === 0 ? padded : padded + "=".repeat(4 - remainder);
  return new Uint8Array(Buffer.from(withPadding, "base64"));
}

async function getAesKey(encryptionKey: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encryptionKey)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptValue(value: string, encryptionKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey(encryptionKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );
  return `${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

export async function decryptValue(input: string, encryptionKey: string) {
  const [rawIv, rawCiphertext] = input.split(".");
  if (!rawIv || !rawCiphertext) {
    throw new Error("Invalid encrypted value format");
  }

  const iv = base64UrlDecodeToBytes(rawIv);
  const ciphertext = base64UrlDecodeToBytes(rawCiphertext);
  const key = await getAesKey(encryptionKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
