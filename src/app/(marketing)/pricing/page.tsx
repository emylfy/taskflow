import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/prisma';
import { parseFeatures } from '@/lib/plan-limits';
import { getCurrentUser } from '@/lib/session';
import styles from './pricing.module.css';

export const metadata = { title: 'Тарифы — TaskFlow' };
export const dynamic = 'force-dynamic';

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU');

function ctaLabelFor(planName: string): string {
  if (planName.toLowerCase().includes('бесплатн')) return 'Начать бесплатно';
  if (planName.toLowerCase().includes('бизнес')) return 'Перейти на Бизнес';
  return `Выбрать «${planName}»`;
}

export default async function PricingPage() {
  const [plans, user] = await Promise.all([
    prisma.plan.findMany({ orderBy: { priceRub: 'asc' } }),
    getCurrentUser(),
  ]);
  const isAuthed = !!user;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/">
          <Logo size={20} />
        </Link>
        <div style={{ flex: 1 }} />
        {isAuthed ? (
          <Link href="/projects">
            <Button variant="primary" size="sm">
              Открыть приложение
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Войти
            </Button>
          </Link>
        )}
      </header>

      <main className={styles.main}>
        <h1>Прозрачные тарифы</h1>
        <p className={styles.lead}>
          Оплата в рублях через ЮKassa. Без скрытых платежей, без карты для стартового тарифа.
        </p>

        <div className={styles.plans}>
          {plans.map((p, idx) => {
            const features = parseFeatures(p.features);
            const isFeatured = p.priceRub > 0 && idx === 1;
            const priceLabel = p.priceRub === 0 ? '0 ₽' : `${PRICE_FORMATTER.format(p.priceRub)} ₽`;
            const suffix = p.priceRub === 0 ? 'навсегда' : 'в месяц';
            const href = isAuthed
              ? p.priceRub === 0
                ? '/projects'
                : `/admin/billing?focus=${p.id}`
              : p.priceRub === 0
                ? '/register'
                : `/register?planId=${p.id}`;
            return (
              <div key={p.id} className={`${styles.plan} ${isFeatured ? styles.planFeatured : ''}`}>
                {isFeatured && <div className={styles.badge}>Популярный</div>}
                <div className={styles.name}>{p.name}</div>
                <div className={styles.price}>
                  <span className={styles.priceValue}>{priceLabel}</span>
                  <span className={styles.priceSuffix}>{suffix}</span>
                </div>
                <Link href={href}>
                  <Button variant={isFeatured ? 'primary' : 'secondary'} block>
                    {ctaLabelFor(p.name)}
                  </Button>
                </Link>
                <div className={styles.sep} />
                <ul className={styles.features}>
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
      </main>
    </div>
  );
}
