import crypto from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyWebhookSignature } from './yookassa';

const SECRET = 'test-webhook-secret';
const BODY = '{"event":"payment.succeeded","object":{"id":"22e12f66-000f-5000-8000-18db351245c7"}}';
const validSig = crypto.createHmac('sha256', SECRET).update(BODY).digest('hex');

describe('verifyWebhookSignature', () => {
  const prev = process.env.YOOKASSA_WEBHOOK_SECRET;
  beforeEach(() => {
    process.env.YOOKASSA_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.YOOKASSA_WEBHOOK_SECRET;
    else process.env.YOOKASSA_WEBHOOK_SECRET = prev;
  });

  it('верная подпись → true', () => {
    expect(verifyWebhookSignature(BODY, validSig)).toBe(true);
  });

  it('подделанное тело → false', () => {
    expect(verifyWebhookSignature(BODY + 'x', validSig)).toBe(false);
  });

  it('отсутствие подписи → false', () => {
    expect(verifyWebhookSignature(BODY, null)).toBe(false);
  });

  it('подпись неверной длины не роняет timingSafeEqual → false', () => {
    expect(verifyWebhookSignature(BODY, 'deadbeef')).toBe(false);
  });

  it('нет секрета в окружении → false', () => {
    delete process.env.YOOKASSA_WEBHOOK_SECRET;
    expect(verifyWebhookSignature(BODY, validSig)).toBe(false);
  });
});
