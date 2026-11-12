import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a binary buffer into an RFC 4648 Base32 string without padding.
 *
 * @param buffer - Binary buffer to encode.
 * @returns Base32 encoded string.
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string back into a binary buffer.
 *
 * @param base32 - Base32 encoded string.
 * @returns Decoded Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const index = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (index === -1) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure random Base32 secret for 2FA registration.
 *
 * @param byteLength - Number of random entropy bytes (default 20 bytes = 160 bits).
 * @returns Base32 secret string.
 */
export function generateTotpSecret(byteLength = 20): string {
  const buffer = randomBytes(byteLength);
  return base32Encode(buffer);
}

/**
 * Computes a 6-digit Time-based One-Time Password (TOTP) token according to RFC 6238.
 *
 * @param secret - Base32 encoded shared secret.
 * @param timeStepSeconds - Duration of a TOTP validity window in seconds (default 30).
 * @param timestampMs - Unix epoch timestamp in milliseconds (default Date.now()).
 * @returns 6-digit zero-padded TOTP code.
 */
export function generateTotp(
  secret: string,
  timeStepSeconds = 30,
  timestampMs = Date.now(),
): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / timeStepSeconds);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Validates a user-supplied 6-digit TOTP token against a Base32 shared secret.
 * Evaluates a temporal tolerance window around the current time step.
 *
 * @param token - 6-digit code entered by user.
 * @param secret - Base32 shared secret.
 * @param window - Number of allowable adjacent time steps before and after (default 1 = +/- 30s).
 * @param timeStepSeconds - Window step length in seconds (default 30).
 * @param timestampMs - Unix epoch timestamp in milliseconds (default Date.now()).
 * @returns True if the token matches any step within the window; otherwise false.
 */
export function verifyTotp(
  token: string,
  secret: string,
  window = 1,
  timeStepSeconds = 30,
  timestampMs = Date.now(),
): boolean {
  if (!token || typeof token !== 'string' || token.trim().length !== 6) {
    return false;
  }

  const cleanToken = token.trim();
  const stepMs = timeStepSeconds * 1000;

  for (let i = -window; i <= window; i++) {
    const candidateTime = timestampMs + i * stepMs;
    const generated = generateTotp(secret, timeStepSeconds, candidateTime);
    if (generated === cleanToken) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a standard `otpauth://totp/...` URI for importing into authenticator apps.
 *
 * @param email - User's account email.
 * @param secret - Base32 shared secret.
 * @param issuer - Platform identity label (default 'CareConnect').
 * @returns Formatted otpauth URI.
 */
export function generateOtpauthUrl(
  email: string,
  secret: string,
  issuer = 'CareConnect',
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
