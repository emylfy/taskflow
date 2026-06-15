'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { I } from '@/components/icons/Icons';
import { signIn } from '@/lib/auth-client';
import { ruAuthError } from '@/lib/auth-errors';
import { registerDemo } from '@/server/actions/demo';
import styles from '../auth.module.css';

export function RegisterForm({ demoEnabled = false }: { demoEnabled?: boolean }) {
  const router = useRouter();
  const [orgName, setOrgName] = React.useState('Команда TaskFlow');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [teamSize, setTeamSize] = React.useState('6–20 человек');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (demoEnabled) {
        // Демо-режим: создаём организацию и сразу входим, без письма.
        // registerDemo внутри делает redirect в приложение.
        await registerDemo({ orgName, name, email });
        return;
      }
      await signIn.magicLink({
        email,
        callbackURL: `/projects?org=${encodeURIComponent(orgName)}&name=${encodeURIComponent(name)}`,
      });
      setDone(true);
    } catch (err) {
      setError(ruAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.form}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
          Мы отправили письмо со ссылкой для подтверждения на <b>{email}</b>. После подтверждения организация «{orgName}» будет создана автоматически.
        </p>
        <div style={{ height: 12 }} />
        <Button variant="secondary" onClick={() => router.push('/login')}>
          Вернуться ко входу
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <Input label="Название организации" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
      <div style={{ height: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          leading={<I.User size={16} stroke="#8B939C" />}
        />
        <Input
          label="Электронная почта"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leading={<I.Mail size={16} stroke="#8B939C" />}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
        {demoEnabled ? 'В демо письмо не отправляется — вход выполнится сразу' : 'Отправим ссылку для входа без пароля'}
      </div>

      <div style={{ height: 14 }} />
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Размер команды</div>
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {['1–5 человек', '6–20 человек', '21+ человек'].map((s, i) => {
          const active = teamSize === s;
          return (
            <button
              type="button"
              key={s}
              onClick={() => setTeamSize(s)}
              style={{
                flex: 1,
                padding: '9px 8px',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: active ? 600 : 500,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div style={{ height: 18 }} />
      <Button variant="primary" size="lg" block type="submit" disabled={loading}>
        {loading
          ? demoEnabled
            ? 'Создаём организацию…'
            : 'Отправляем ссылку…'
          : 'Создать организацию'}
      </Button>
      {error && <div className={styles.error}>{error}</div>}
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.5 }}>
        Продолжая, вы соглашаетесь с{' '}
        <Link href="/legal/terms" className={styles.link}>договором-офертой</Link> и{' '}
        <Link href="/legal/privacy" className={styles.link}>политикой обработки персональных данных</Link>.
      </p>
    </form>
  );
}

function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
