import crypto from 'node:crypto';

const API_BASE = 'https://api.yookassa.ru/v3';

type CreatePaymentInput = {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
};

type YooPayment = {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
  confirmation: { type: string; confirmation_url?: string };
};

function authHeader(): string {
  const shop = process.env.YOOKASSA_SHOP_ID ?? '';
  const secret = process.env.YOOKASSA_SECRET_KEY ?? '';
  return 'Basic ' + Buffer.from(`${shop}:${secret}`).toString('base64');
}

export async function createPayment(input: CreatePaymentInput): Promise<YooPayment> {
  const idempotenceKey = crypto.randomUUID();
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: { value: input.amountRub.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      description: input.description,
      metadata: input.metadata,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ЮKassa error ${res.status}: ${text}`);
  }
  return (await res.json()) as YooPayment;
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.YOOKASSA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}
