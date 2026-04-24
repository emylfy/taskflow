import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import styles from './billing.module.css';

export const metadata = { title: 'Тарифы и оплата — TaskFlow' };

const PLANS = [
  {
    name: 'Бесплатный',
    price: '0 ₽',
    suffix: 'навсегда',
    features: ['До 3 пользователей', 'До 2 проектов', 'Канбан и комментарии', 'История изменений 7 дней'],
    cta: 'Текущий тариф',
    variant: 'secondary' as const,
    disabled: true,
  },
  {
    name: 'Команда',
    price: '1 500 ₽',
    suffix: 'в месяц',
    features: [
      'До 20 пользователей',
      'Безлимит проектов',
      'Совместное редактирование в реальном времени',
      'История версий без ограничений',
      'Приоритет в поддержке',
    ],
    cta: 'Выбрать',
    variant: 'primary' as const,
    badge: 'Популярный',
    selected: true,
  },
  {
    name: 'Бизнес',
    price: '4 500 ₽',
    suffix: 'в месяц',
    features: [
      'Без ограничений по участникам',
      'SLA 99,9 %',
      'Единый вход (SSO)',
      'Расширенный журнал действий',
      'Персональный менеджер',
    ],
    cta: 'Выбрать',
    variant: 'secondary' as const,
  },
];

const METHODS = [
  { t: 'МИР', sub: 'Карта российского банка', a: true, glyph: 'МИР', color: '#1A1D23' },
  { t: 'СБП', sub: 'Система быстрых платежей', glyph: 'СБП', color: '#B23A3A' },
  { t: 'ЮMoney', sub: 'Кошелёк ЮMoney', glyph: 'Ю', color: '#8A43B8' },
  { t: 'СберPay', sub: 'Оплата по QR-коду', glyph: 'S', color: '#2E7D3E' },
];

export default function BillingPage() {
  return (
    <div className={styles.main}>
          <div className={styles.plans}>
            <h1>Тарифы</h1>
            <p>Выберите тариф, который подходит вашей команде. Оплата в рублях через ЮKassa.</p>

            <div className={styles.plansGrid}>
              {PLANS.map((p) => (
                <div key={p.name} className={`${styles.plan} ${p.selected ? styles.planFeatured : ''}`}>
                  {p.badge && <div className={styles.planBadge}>{p.badge}</div>}
                  <div className={styles.planName}>{p.name}</div>
                  <div className={styles.planPrice}>
                    <span className={styles.planPriceValue}>{p.price}</span>
                    <span className={styles.planPriceSuffix}>{p.suffix}</span>
                  </div>
                  <div className={styles.planNote}>за всю команду, с НДС</div>
                  <Button variant={p.variant} block disabled={p.disabled}>
                    {p.cta}
                  </Button>
                  <div className={styles.planSep} />
                  <ul className={styles.planFeatures}>
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
          </div>

          <aside className={styles.payModal}>
            <div className={styles.payHead}>
              <div className={styles.payTitle}>Оплата тарифа</div>
              <div style={{ flex: 1 }} />
              <I.X size={18} stroke="#5B6670" />
            </div>
            <div className={styles.payBody}>
              <div className={styles.summary}>
                <div className={styles.summaryRow}>
                  <span>Тариф</span>
                  <span className={styles.bold}>Команда · месячная подписка</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Период</span>
                  <span>1 месяц</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Организация</span>
                  <span>Команда TaskFlow</span>
                </div>
                <div className={styles.summarySep} />
                <div className={styles.summaryTotal}>
                  <span>К оплате</span>
                  <span className={styles.total}>1 500 ₽</span>
                </div>
                <div className={styles.vat}>в том числе НДС 20 %: 250 ₽</div>
              </div>

              <div className={styles.methodTitle}>Способ оплаты</div>
              <div className={styles.methods}>
                {METHODS.map((m) => (
                  <label key={m.t} className={`${styles.method} ${m.a ? styles.methodActive : ''}`}>
                    <span className={`${styles.radio} ${m.a ? styles.radioOn : ''}`}>
                      {m.a && <span className={styles.radioDot} />}
                    </span>
                    <span className={styles.methodBadge} style={{ color: m.color }}>
                      {m.glyph}
                    </span>
                    <span className={styles.methodInfo}>
                      <span className={styles.methodName}>{m.t}</span>
                      <span className={styles.methodSub}>{m.sub}</span>
                    </span>
                  </label>
                ))}
              </div>

              <Button variant="primary" size="lg" block trailing={<I.ArrowRight size={14} stroke="#fff" />}>
                Перейти к оплате · 1 500 ₽
              </Button>

              <div className={styles.secure}>
                <I.Shield size={16} stroke="#2E7D3E" />
                <span>
                  Оплата через ЮKassa. Данные карты не сохраняются на наших серверах. После оплаты подписка активируется
                  автоматически, чек придёт на почту <b>ivan.sokolov@taskflow.ru</b>.
                </span>
              </div>
            </div>
          </aside>
    </div>
  );
}
