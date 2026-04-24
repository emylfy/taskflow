'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { I } from '@/components/icons/Icons';
import { signIn } from '@/lib/auth-client';
import styles from '../auth.module.css';

export function LoginForm() {
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
        placeholder="ivan.sokolov@kontur-dg.ru"
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
    </div>
  );
}
