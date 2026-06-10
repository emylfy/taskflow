'use client';

import * as React from 'react';
import Link from 'next/link';
import styles from './status.module.css';

// Граница ошибок верхнего уровня: ловит непредвиденные сбои рендера/запросов на
// страницах и показывает аккуратный экран вместо стека и исходного кода.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>!</div>
        <h1 className={styles.title}>Что-то пошло не так</h1>
        <p className={styles.text}>
          Произошла непредвиденная ошибка. Попробуйте повторить действие; если
          ошибка повторяется — обновите страницу позже.
        </p>
        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => reset()}>
            Повторить
          </button>
          <Link href="/projects" className={`${styles.btn} ${styles.btnSecondary}`}>
            На главную
          </Link>
        </div>
        {error.digest && <div className={styles.digest}>Код: {error.digest}</div>}
      </div>
    </div>
  );
}
