import { createHmac } from 'node:crypto';

/**
 * Verify HMAC-SHA256 signature from AbacatePay webhook
 * @param body - Raw request body (string)
 * @param signature - Signature from x-abacatepay-signature header
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const calculated = hmac.digest('hex');

    return calculated === signature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}
