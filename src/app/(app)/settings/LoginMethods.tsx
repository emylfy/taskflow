'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { unlinkYandex } from '@/server/actions/profile';
import styles from './settings.module.css';

const actionBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: '5px 12px',
  borderRadius: 8,
  border: '1px solid #D8DCE0',
  background: '#fff',
  color: 'var(--text)',
  cursor: 'pointer',
};

// Способы входа с действиями: Яндекс ID можно привязать (вход остаётся и по
// почте, и через Яндекс) или отвязать. Вход по ссылке на почту доступен всегда.
export function LoginMethods({
  hasYandex,
  yandexEnabled,
  isDemo,
}: {
  hasYandex: boolean;
  yandexEnabled: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function link() {
    setBusy(true);
    setError(null);
    try {
      // Серверный маршрут генерит URL авторизации Яндекса и привязывает аккаунт
      // к текущей сессии (по совпадающему email). Делаем редирект вручную.
      const res = await authClient.$fetch('/oauth2/link', {
        method: 'POST',
        body: { providerId: 'yandex', callbackURL: '/settings' },
      });
      const url = (res as { data?: { url?: string } } | undefined)?.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Не удалось начать привязку Яндекс ID');
      setBusy(false);
    } catch {
      setError('Не удалось начать привязку Яндекс ID');
      setBusy(false);
    }
  }

  async function unlink() {
    if (!confirm('Отвязать Яндекс ID? Вход по ссылке на почту останется доступным.')) return;
    setBusy(true);
    setError(null);
    try {
      await unlinkYandex();
      router.refresh();
    } catch {
      setError('Не удалось отвязать Яндекс ID');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.loginCard}>
      <div className={styles.loginTitle}>Способы входа в аккаунт</div>

      <div className={styles.loginRow}>
        <span className={`${styles.radio} ${hasYandex ? styles.radioOn : ''}`}>
          {hasYandex && <span className={styles.radioDot} />}
        </span>
        <span className={styles.loginName}>Яндекс ID</span>
        <span className={styles.loginDesc}>· {hasYandex ? 'привязан' : 'не привязан'}</span>
        <div style={{ flex: 1 }} />
        {isDemo ? (
          <span style={{ fontSize: 12, color: '#8B939C' }}>в демо-режиме недоступно</span>
        ) : yandexEnabled ? (
          hasYandex ? (
            <button type="button" onClick={unlink} disabled={busy} style={actionBtn}>
              Отвязать
            </button>
          ) : (
            <button type="button" onClick={link} disabled={busy} style={actionBtn}>
              Привязать
            </button>
          )
        ) : (
          <span style={{ fontSize: 12, color: '#8B939C' }}>выключен на сервере</span>
        )}
      </div>

      <div className={styles.loginRow}>
        <span className={`${styles.radio} ${styles.radioOn}`}>
          <span className={styles.radioDot} />
        </span>
        <span className={styles.loginName}>Ссылка на почту</span>
        <span className={styles.loginDesc}>· всегда доступна</span>
      </div>

      <div style={{ fontSize: 12, color: '#8B939C', marginTop: 8 }}>
        Можно пользоваться обоими способами: ссылка на почту работает всегда, Яндекс ID — после привязки.
      </div>
      {error ? <div style={{ fontSize: 12, color: '#B23A3A', marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}

export default LoginMethods;
