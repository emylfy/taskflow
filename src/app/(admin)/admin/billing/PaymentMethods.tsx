'use client';

import * as React from 'react';
import styles from './billing.module.css';

// Способы оплаты. Итоговый способ всё равно выбирается на защищённой странице
// ЮKassa, но выбор здесь — настоящий интерактив (а не «всегда первый активен»).
const METHODS = [
  { t: 'МИР', sub: 'Карта российского банка', glyph: 'МИР', color: '#1A1D23' },
  { t: 'СБП', sub: 'Система быстрых платежей', glyph: 'СБП', color: '#B23A3A' },
  { t: 'ЮMoney', sub: 'Кошелёк ЮMoney', glyph: 'Ю', color: '#8A43B8' },
  { t: 'СберPay', sub: 'Оплата по QR-коду', glyph: 'S', color: '#2E7D3E' },
  { t: 'Сбербанк Онлайн', sub: 'Оплата через СберБанк Онлайн', glyph: 'С', color: '#2E7D3E' },
];

export function PaymentMethods() {
  const [selected, setSelected] = React.useState(0);
  return (
    <>
      <div className={styles.methodTitle}>Способ оплаты</div>
      <div className={styles.methods}>
        {METHODS.map((m, i) => {
          const active = i === selected;
          return (
            <label
              key={m.t}
              className={`${styles.method} ${active ? styles.methodActive : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={m.t}
                checked={active}
                onChange={() => setSelected(i)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <span className={`${styles.radio} ${active ? styles.radioOn : ''}`}>
                {active && <span className={styles.radioDot} />}
              </span>
              <span className={styles.methodBadge} style={{ color: m.color }}>
                {m.glyph}
              </span>
              <span className={styles.methodInfo}>
                <span className={styles.methodName}>{m.t}</span>
                <span className={styles.methodSub}>{m.sub}</span>
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}

export default PaymentMethods;
