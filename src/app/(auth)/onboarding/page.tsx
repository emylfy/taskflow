import * as React from 'react';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { createOrganizationFromForm } from '@/server/actions/organizations';
import styles from '../auth.module.css';

export const metadata = { title: 'Создание команды — TaskFlow' };
export const dynamic = 'force-dynamic';

// Онбординг для авторизованного пользователя без организации (первый вход
// через Яндекс или magic-link). Просим название команды → создаём организацию
// (OWNER + бесплатный тариф) → ведём в приложение. Если организация уже есть —
// сразу редиректим в /projects (защита от петли и повторного захода).
export default async function OnboardingPage() {
  const user = await requireUser();
  const existing = await prisma.member.findFirst({ where: { userId: user.id } });
  if (existing) redirect('/projects');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size={20} />
      </header>
      <main className={styles.main}>
        <div className={styles.card} style={{ width: 460 }}>
          <div className={styles.title}>
            <h1>Создание команды</h1>
            <p>
              Вы вошли как {user.name || user.email}. Назовите свою команду — и сразу
              попадёте в приложение.
            </p>
          </div>
          <form className={styles.form} action={createOrganizationFromForm}>
            <label
              htmlFor="orgName"
              style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}
            >
              Название команды
            </label>
            <input
              id="orgName"
              name="orgName"
              required
              autoFocus
              defaultValue="Моя команда"
              maxLength={60}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--text)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-input)',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ height: 18 }} />
            <Button variant="primary" size="lg" block type="submit">
              Создать команду
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
