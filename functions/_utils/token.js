const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(base64) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return `${base64}${padding}`;
}

function bytesToBase64(bytes) {
  let output = "";
  for (let i = 0; i < bytes.length; i += 1) {
    output += String.fromCharCode(bytes[i]);
  }
  return btoa(output);
}

function base64ToBytes(base64) {
  const text = atob(base64);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

async function importSecret(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

async function sign(message, secret) {
  const key = await importSecret(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signatureBuffer);
}

export async function createToken(payload, secret, ttlSeconds = 43200) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const tokenPayload = {
    ...payload,
    exp: expiresAt,
  };

  const encodedPayload = toBase64Url(bytesToBase64(encoder.encode(JSON.stringify(tokenPayload))));
  const signature = await sign(encodedPayload, secret);
  const encodedSignature = toBase64Url(bytesToBase64(signature));
  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifyToken(token, secret) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");
  const expectedSignature = await sign(encodedPayload, secret);
  const providedSignature = base64ToBytes(fromBase64Url(encodedSignature));

  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i += 1) {
    mismatch |= providedSignature[i] ^ expectedSignature[i];
  }
  if (mismatch !== 0) {
    return null;
  }

  try {
    const payloadBytes = base64ToBytes(fromBase64Url(encodedPayload));
    const payload = JSON.parse(decoder.decode(payloadBytes));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
