import * as React from 'react';
import Link from 'next/link';
import styles from './status.module.css';

export const metadata = { title: 'Страница не найдена — TaskFlow' };

// Экран 404: показывается, когда запрошенного ресурса нет либо вызван notFound().
export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconNeutral}`}>?</div>
        <div className={styles.code}>Ошибка 404</div>
        <h1 className={styles.title}>Страница не найдена</h1>
        <p className={styles.text}>
          Запрошенная страница не существует или была перемещена. Проверьте адрес
          или вернитесь к списку проектов.
        </p>
        <div className={styles.actions}>
          <Link href="/projects" className={`${styles.btn} ${styles.btnPrimary}`}>
            К проектам
          </Link>
          <Link href="/" className={`${styles.btn} ${styles.btnSecondary}`}>
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
