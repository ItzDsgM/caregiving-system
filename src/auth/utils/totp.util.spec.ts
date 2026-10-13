import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  generateOtpauthUrl,
} from './totp.util';

describe('TOTP Utility (RFC 6238)', () => {
  describe('base32Encode & base32Decode', () => {
    it('should round-trip encode and decode an arbitrary buffer', () => {
      const original = Buffer.from('CareConnectSecureSecret123');
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);

      expect(decoded.toString()).toBe(original.toString());
    });

    it('should ignore padding and whitespace when decoding', () => {
      const original = Buffer.from('test-secret');
      const encoded = base32Encode(original) + '===';
      const decoded = base32Decode(`  ${encoded}  `);

      expect(decoded.toString()).toBe(original.toString());
    });
  });

  describe('generateTotpSecret', () => {
    it('should generate a 32-character base32 secret by default (20 bytes)', () => {
      const secret = generateTotpSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBe(32);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });
  });

  describe('generateTotp', () => {
    it('should generate a valid 6-digit numeric string', () => {
      const secret = generateTotpSecret();
      const code = generateTotp(secret);

      expect(code).toMatch(/^\d{6}$/);
    });

    it('should produce identical codes within the same 30-second window', () => {
      const secret = generateTotpSecret();
      const baseTime = 1700000010000; // Aligned to step
      const stepStart = Math.floor(baseTime / 30000) * 30000;
      const code1 = generateTotp(secret, 30, stepStart + 2000);
      const code2 = generateTotp(secret, 30, stepStart + 15000); // within same 30s step

      expect(code1).toBe(code2);
    });

    it('should produce different codes across different 30-second steps', () => {
      const secret = generateTotpSecret();
      const baseTime = 1700000010000;
      const stepStart = Math.floor(baseTime / 30000) * 30000;
      const code1 = generateTotp(secret, 30, stepStart);
      const code2 = generateTotp(secret, 30, stepStart + 35000); // next step

      expect(code1).not.toBe(code2);
    });
  });

  describe('verifyTotp', () => {
    it('should successfully verify a valid code at the exact timestamp', () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      const code = generateTotp(secret, 30, now);

      expect(verifyTotp(code, secret, 1, 30, now)).toBe(true);
    });

    it('should verify code within +/- 1 step window tolerance', () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      const pastCode = generateTotp(secret, 30, now - 30000);
      const futureCode = generateTotp(secret, 30, now + 30000);

      expect(verifyTotp(pastCode, secret, 1, 30, now)).toBe(true);
      expect(verifyTotp(futureCode, secret, 1, 30, now)).toBe(true);
    });

    it('should reject code outside allowable window', () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      const distantPastCode = generateTotp(secret, 30, now - 90000); // -90s (3 steps away)

      expect(verifyTotp(distantPastCode, secret, 1, 30, now)).toBe(false);
    });

    it('should return false for malformed or empty token strings', () => {
      const secret = generateTotpSecret();
      expect(verifyTotp('', secret)).toBe(false);
      expect(verifyTotp('123', secret)).toBe(false);
      expect(verifyTotp('abcdef', secret)).toBe(false);
      expect(verifyTotp('1234567', secret)).toBe(false);
    });
  });

  describe('generateOtpauthUrl', () => {
    it('should return a properly formatted otpauth URI with label, secret, and issuer', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const url = generateOtpauthUrl('user@test.com', secret, 'CareConnect');

      expect(url).toContain('otpauth://totp/CareConnect:user%40test.com');
      expect(url).toContain(`secret=${secret}`);
      expect(url).toContain('issuer=CareConnect');
    });
  });
});
