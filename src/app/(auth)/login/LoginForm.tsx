'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { I } from '@/components/icons/Icons';
import { signIn } from '@/lib/auth-client';
import { loginAsDemo } from '@/server/actions/demo';
import styles from '../auth.module.css';

const DEMO_USERS = [
  { email: 'ivan.sokolov@taskflow.ru', name: 'Иван Соколов', role: 'Владелец' },
  { email: 'maria.petrova@taskflow.ru', name: 'Мария Петрова', role: 'Администратор' },
  { email: 'sergey.nikolaev@taskflow.ru', name: 'Сергей Николаев', role: 'Участник' },
];

type Props = { demoEnabled: boolean };

export function LoginForm({ demoEnabled }: Props) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function onYandex() {
    setStatus('sending');
    try {
      await signIn.oauth2({ providerId: 'yandex', callbackURL: '/projects' });
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
    }
  }

  async function onMagic() {
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    try {
      await signIn.magicLink({ email: email.trim(), callbackURL: '/projects' });
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
    }
  }

  return (
    <div className={styles.form}>
      <Button
        variant="dark"
        size="lg"
        block
        onClick={onYandex}
        disabled={status === 'sending'}
        leading={
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <rect width="24" height="24" rx="4" fill="#FC3F1D" />
            <text x="12" y="17" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="14" fill="#fff">
              Я
            </text>
          </svg>
        }
      >
        Войти через Яндекс ID
      </Button>

      <div className={styles.divider}>
        <span />
        или
        <span />
      </div>

      <Input
        label="Адрес электронной почты"
        type="email"
        placeholder="ivan.sokolov@taskflow.ru"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leading={<I.Mail size={16} stroke="#8B939C" />}
      />
      <div style={{ height: 12 }} />
      <Button
        variant="secondary"
        size="lg"
        block
        onClick={onMagic}
        disabled={status === 'sending' || !email.trim()}
      >
        {status === 'sent' ? 'Ссылка отправлена, проверьте почту' : 'Получить ссылку для входа'}
      </Button>
      {error && <div className={styles.error}>{error}</div>}

      {demoEnabled && (
        <>
          <div className={styles.divider}>
            <span />
            демо-режим
            <span />
          </div>
          <div className={styles.demoHint}>
            Быстрый вход без почты и OAuth для демонстрации. Доступен, пока в окружении задан{' '}
            <code>DEMO_MODE=true</code>.
          </div>
          <div className={styles.demoList}>
            {DEMO_USERS.map((u) => (
              <form key={u.email} action={loginAsDemo.bind(null, u.email)}>
                <button type="submit" className={styles.demoRow}>
                  <span className={styles.demoAvatar}>{u.name.split(' ').map((s) => s[0]).join('')}</span>
                  <span className={styles.demoInfo}>
                    <span className={styles.demoName}>{u.name}</span>
                    <span className={styles.demoRole}>{u.role}</span>
                  </span>
                  <I.ArrowRight size={14} stroke="#8B939C" />
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
