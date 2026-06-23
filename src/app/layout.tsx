import * as React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { THEME_COOKIE, type Theme } from '@/lib/theme';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TaskFlow — совместная работа над задачами',
  description:
    'Веб-приложение для команд: канбан, карточки задач, чаты и совместное редактирование. Данные в РФ, оплата в рублях через ЮKassa.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Тему читаем из cookie на сервере и проставляем data-theme до отрисовки —
  // так нет вспышки светлой темы при загрузке. Дефолт — тёмная.
  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get(THEME_COOKIE)?.value === 'light' ? 'light' : 'dark';
  return (
    <html lang="ru" data-theme={theme} className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
