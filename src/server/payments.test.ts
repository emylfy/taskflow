import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findUnique: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    activityLog: { create: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

vi.mock('@/lib/yookassa', () => ({
  getPayment: vi.fn(),
}));

import { confirmPaymentById } from './payments';
import { prisma } from '@/lib/prisma';
import { getPayment } from '@/lib/yookassa';

const mPrisma = prisma as unknown as {
  payment: { findUnique: ReturnType<typeof vi.fn> };
  subscription: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};
const mGetPayment = getPayment as unknown as ReturnType<typeof vi.fn>;

const PID = '22e12f66-000f-5000-8000-18db351245c7';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('confirmPaymentById', () => {
  it('платёж не найден → unknown (API не запрашивается)', async () => {
    mPrisma.payment.findUnique.mockResolvedValue(null);
    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'unknown' });
    expect(mGetPayment).not.toHaveBeenCalled();
  });

  it('идемпотентность: уже SUCCESS → already-active без запроса к API', async () => {
    mPrisma.payment.findUnique.mockResolvedValue({ providerId: PID, status: 'SUCCESS' });
    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'already-active' });
    expect(mGetPayment).not.toHaveBeenCalled();
  });

  it('succeeded+paid → activated, выполняется транзакция активации', async () => {
    mPrisma.payment.findUnique.mockResolvedValue({
      providerId: PID,
      status: 'PENDING',
      subscriptionId: 'sub1',
      amountRub: 990,
    });
    mGetPayment.mockResolvedValue({ status: 'succeeded', paid: true });
    mPrisma.subscription.findUnique.mockResolvedValue({
      id: 'sub1',
      organizationId: 'org1',
      planId: 'plan1',
      expiresAt: new Date(Date.now() - 1000),
      organization: { members: [{ userId: 'owner1' }] },
    });

    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'activated' });
    expect(mPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('succeeded, но подписка пропала → unknown', async () => {
    mPrisma.payment.findUnique.mockResolvedValue({
      providerId: PID,
      status: 'PENDING',
      subscriptionId: 'subX',
      amountRub: 990,
    });
    mGetPayment.mockResolvedValue({ status: 'succeeded', paid: true });
    mPrisma.subscription.findUnique.mockResolvedValue(null);

    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'unknown' });
  });

  it('canceled → canceled', async () => {
    mPrisma.payment.findUnique.mockResolvedValue({
      providerId: PID,
      status: 'PENDING',
      subscriptionId: 'sub1',
    });
    mGetPayment.mockResolvedValue({ status: 'canceled' });
    mPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub1', status: 'PENDING' });

    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'canceled' });
  });

  it('pending → pending', async () => {
    mPrisma.payment.findUnique.mockResolvedValue({
      providerId: PID,
      status: 'PENDING',
      subscriptionId: 'sub1',
    });
    mGetPayment.mockResolvedValue({ status: 'pending', paid: false });

    const res = await confirmPaymentById(PID);
    expect(res).toEqual({ status: 'pending' });
  });
});
