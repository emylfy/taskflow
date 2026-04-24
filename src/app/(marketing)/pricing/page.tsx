import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import styles from './pricing.module.css';

export const metadata = { title: 'Тарифы — TaskFlow' };

const PLANS = [
  { name: 'Бесплатный', price: '0 ₽', suffix: 'навсегда', features: ['До 3 пользователей', 'До 2 проектов', 'Канбан и комментарии'], cta: 'Начать бесплатно', variant: 'secondary' as const },
  { name: 'Команда', price: '1 500 ₽', suffix: 'в месяц', features: ['До 20 пользователей', 'Безлимит проектов', 'Совместное редактирование', 'История версий'], cta: 'Выбрать Команду', variant: 'primary' as const, badge: 'Популярный' },
  { name: 'Бизнес', price: '4 500 ₽', suffix: 'в месяц', features: ['Без ограничений', 'SLA 99,9 %', 'Единый вход (SSO)', 'Приоритетная поддержка'], cta: 'Связаться', variant: 'secondary' as const },
];

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/">
          <Logo size={20} />
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Войти
          </Button>
        </Link>
      </header>

      <main className={styles.main}>
        <h1>Прозрачные тарифы</h1>
        <p className={styles.lead}>Оплата в рублях через ЮKassa. Без скрытых платежей, без карты для стартового тарифа.</p>

        <div className={styles.plans}>
          {PLANS.map((p) => (
            <div key={p.name} className={`${styles.plan} ${p.badge ? styles.planFeatured : ''}`}>
              {p.badge && <div className={styles.badge}>{p.badge}</div>}
              <div className={styles.name}>{p.name}</div>
              <div className={styles.price}>
                <span className={styles.priceValue}>{p.price}</span>
                <span className={styles.priceSuffix}>{p.suffix}</span>
              </div>
              <Link href="/register">
                <Button variant={p.variant} block>
                  {p.cta}
                </Button>
              </Link>
              <div className={styles.sep} />
              <ul className={styles.features}>
                {p.features.map((f) => (
                  <li key={f}>
                    <I.Check size={16} stroke="#2E7D3E" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
