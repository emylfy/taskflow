import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { parseFeatures, FREE_FEATURES } from '@/lib/plan-limits';
import { startCheckoutForm } from '@/server/actions/billing';
import { confirmPendingPaymentForOrg, type ConfirmResult } from '@/server/payments';
import { PaymentMethods } from './PaymentMethods';
import styles from './billing.module.css';

export const metadata = { title: 'Тарифы и оплата — TaskFlow' };
export const dynamic = 'force-dynamic';

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU');

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const focusPlanId = typeof sp.focus === 'string' ? sp.focus : undefined;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const justReturned = typeof sp.return === 'string';

  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!member) throw new Error('Вы не состоите ни в одной организации');

  // Возврат с ЮKassa: локально вебхук не может достучаться до localhost, поэтому
  // подтверждаем оплату здесь — перезапрашиваем статус последнего ожидающего
  // платежа из API ЮKassa и активируем подписку. Идемпотентно; сетевые ошибки
  // не должны ронять страницу (в этом случае показываем нейтральное сообщение).
  let returnResult: ConfirmResult | null = null;
  if (justReturned && process.env.YOOKASSA_SECRET_KEY) {
    try {
      returnResult = await confirmPendingPaymentForOrg(member.organizationId);
    } catch (e) {
      console.error('Подтверждение оплаты при возврате не удалось:', e);
    }
  }

  const [plans, currentSub, usage] = await Promise.all([
    prisma.plan.findMany({ orderBy: { priceRub: 'asc' } }),
    prisma.subscription.findFirst({
      where: { organizationId: member.organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { expiresAt: 'desc' },
    }),
    prisma.organization.findUnique({
      where: { id: member.organizationId },
      select: { _count: { select: { projects: true, members: true } } },
    }),
  ]);

  const currentFeatures = currentSub ? parseFeatures(currentSub.plan.features) : FREE_FEATURES;
  const currentPlanName = currentSub?.plan.name ?? 'Бесплатный';
  const focused = focusPlanId ? plans.find((p) => p.id === focusPlanId) ?? null : null;

  return (
    <div className={styles.main}>
      <div className={styles.plans}>
        <h1>Тарифы</h1>
        <p>
          Текущий тариф: <b>«{currentPlanName}»</b>
          {currentSub && currentSub.plan.priceRub > 0 ? (
            <>
              {' · '}
              действует до{' '}
              <b>
                {currentSub.expiresAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
              </b>
            </>
          ) : null}
          .
        </p>

        <div className={styles.summaryRow} style={{ marginTop: 16, marginBottom: 16 }}>
          <span>
            Проекты: <b>{usage?._count.projects ?? 0}</b>
            {currentFeatures.limits.maxProjects === -1 ? ' / ∞' : ` / ${currentFeatures.limits.maxProjects}`}
          </span>
          <span style={{ marginLeft: 16 }}>
            Участники: <b>{usage?._count.members ?? 0}</b>
            {currentFeatures.limits.maxMembers === -1 ? ' / ∞' : ` / ${currentFeatures.limits.maxMembers}`}
          </span>
        </div>

        {status === 'free-activated' ? (
          <p style={{ color: '#2E7D3E' }}>Тариф «Бесплатный» активирован.</p>
        ) : null}
        {justReturned && (returnResult?.status === 'activated' || returnResult?.status === 'already-active') ? (
          <p style={{ color: '#2E7D3E' }}>Оплата подтверждена — тариф активирован.</p>
        ) : justReturned && returnResult?.status === 'canceled' ? (
          <p style={{ color: '#B23A3A' }}>Платёж отменён. Подписка не изменена.</p>
        ) : justReturned && returnResult?.status === 'pending' ? (
          <p style={{ color: '#5B6670' }}>Платёж ещё обрабатывается — обновите страницу через минуту.</p>
        ) : justReturned ? (
          <p style={{ color: '#5B6670' }}>
            Вы вернулись со страницы оплаты ЮKassa. Если статус подписки не изменился — подождите минуту:
            подтверждение приходит по вебхуку.
          </p>
        ) : null}

        <div className={styles.plansGrid}>
          {plans.map((p) => {
            const features = parseFeatures(p.features);
            const isCurrent = currentSub?.planId === p.id;
            const isPopular = p.priceRub > 0 && p.priceRub < 2000;
            const priceLabel = p.priceRub === 0 ? '0 ₽' : `${PRICE_FORMATTER.format(p.priceRub)} ₽`;
            const suffix = p.priceRub === 0 ? 'навсегда' : 'в месяц';
            const ctaLabel = isCurrent ? 'Текущий тариф' : p.priceRub === 0 ? 'Перейти на бесплатный' : 'Выбрать';
            return (
              <div key={p.id} className={`${styles.plan} ${isPopular ? styles.planFeatured : ''}`}>
                {isPopular && !isCurrent ? <div className={styles.planBadge}>Популярный</div> : null}
                {isCurrent ? <div className={styles.planBadge}>Активен</div> : null}
                <div className={styles.planName}>{p.name}</div>
                <div className={styles.planPrice}>
                  <span className={styles.planPriceValue}>{priceLabel}</span>
                  <span className={styles.planPriceSuffix}>{suffix}</span>
                </div>
                <div className={styles.planNote}>за всю команду, с НДС</div>
                <form action={startCheckoutForm.bind(null, { organizationId: member.organizationId, planId: p.id })}>
                  <Button
                    type="submit"
                    variant={isPopular && !isCurrent ? 'primary' : 'secondary'}
                    block
                    disabled={isCurrent}
                  >
                    {ctaLabel}
                  </Button>
                </form>
                <div className={styles.planSep} />
                <ul className={styles.planFeatures}>
                  {features.display.map((f) => (
                    <li key={f}>
                      <I.Check size={16} stroke="#2E7D3E" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {focused && focused.priceRub > 0 ? (
        <aside className={styles.payModal}>
          <div className={styles.payHead}>
            <div className={styles.payTitle}>Оплата тарифа</div>
            <div style={{ flex: 1 }} />
            <a href="/admin/billing" aria-label="Закрыть">
              <I.X size={18} stroke="#5B6670" />
            </a>
          </div>
          <div className={styles.payBody}>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Тариф</span>
                <span className={styles.bold}>{focused.name} · месячная подписка</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Период</span>
                <span>1 месяц</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Организация</span>
                <span>{member.organization.name}</span>
              </div>
              <div className={styles.summarySep} />
              <div className={styles.summaryTotal}>
                <span>К оплате</span>
                <span className={styles.total}>{PRICE_FORMATTER.format(focused.priceRub)} ₽</span>
              </div>
              <div className={styles.vat}>
                в том числе НДС 20 %: {PRICE_FORMATTER.format(Math.round(focused.priceRub * 0.2))} ₽
              </div>
            </div>

            <PaymentMethods />

            <form action={startCheckoutForm.bind(null, { organizationId: member.organizationId, planId: focused.id })}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                block
                trailing={<I.ArrowRight size={14} stroke="#fff" />}
              >
                Перейти к оплате · {PRICE_FORMATTER.format(focused.priceRub)} ₽
              </Button>
            </form>

            <div className={styles.secure}>
              <I.Shield size={16} stroke="#2E7D3E" />
              <span>
                Оплата через ЮKassa. Данные карты не сохраняются на наших серверах. После оплаты подписка
                активируется по вебхуку, чек придёт на почту <b>{user.email}</b>.
              </span>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
