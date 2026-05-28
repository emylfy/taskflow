import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { LoginForm } from './LoginForm';
import styles from '../auth.module.css';

export const metadata = { title: 'Вход — TaskFlow' };

const demoEnabled = process.env.DEMO_MODE === 'true';
// Кнопку «Войти через Яндекс ID» показываем только когда OAuth реально
// настроен — иначе клик по ней приводит к ошибке (провайдер не зарегистрирован).
const yandexEnabled = !!(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo size={20} />
      </header>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.title}>
            <div className={styles.titleLogo}>
              <Logo size={22} showText={false} />
            </div>
            <h1>Вход в TaskFlow</h1>
            <p>Войдите в свою организацию</p>
          </div>
          <LoginForm demoEnabled={demoEnabled} yandexEnabled={yandexEnabled} />
          <div className={styles.alt}>
            Нет организации?{' '}
            <Link href="/register" className={styles.link}>
              Создать организацию
            </Link>
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>© 2026 TaskFlow</span>
        <Link href="/legal/privacy">Политика персональных данных</Link>
        <Link href="/legal/terms">Договор-оферта</Link>
        <div style={{ flex: 1 }} />
        <span>Данные в РФ</span>
      </footer>
    </div>
  );
}
