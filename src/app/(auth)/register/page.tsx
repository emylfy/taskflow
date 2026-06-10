import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { RegisterForm } from './RegisterForm';
import styles from '../auth.module.css';

export const metadata = { title: 'Регистрация — TaskFlow' };

const demoEnabled = process.env.DEMO_MODE === 'true';

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size={20} />
      </header>
      <main className={styles.main}>
        <div className={styles.card} style={{ width: 460 }}>
          <div className={styles.title}>
            <h1>Создание организации</h1>
            <p>Быстрая регистрация: владелец получает доступ к проектам и участникам.</p>
          </div>
          {demoEnabled && (
            <div className={styles.demoBanner}>
              Демо-режим: форма сразу создаёт организацию и открывает приложение — без письма.
              Можно также{' '}
              <Link href="/login" className={styles.link}>войти как существующий пользователь</Link>.
            </div>
          )}
          <RegisterForm demoEnabled={demoEnabled} />
          <div className={styles.alt}>
            Уже есть аккаунт?{' '}
            <Link href="/login" className={styles.link}>
              Войти
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
