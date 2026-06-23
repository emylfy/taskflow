'use client';

import * as React from 'react';
import { THEME_COOKIE, type Theme } from '@/lib/theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Хранит выбранную тему и делит её между переключателем в TopBar и компонентами,
 * которым нужно знать текущую тему (например BlockNote-редактор). Начальное
 * значение приходит из cookie на сервере (корневой layout проставляет
 * data-theme на <html> до отрисовки — без вспышки), поэтому здесь нет эффекта,
 * меняющего тему при монтировании. Дефолт — тёмная.
 */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem(THEME_COOKIE, t);
    } catch {
      // localStorage может быть недоступен (приватный режим) — cookie достаточно.
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Доступ к теме. Вне провайдера возвращает безопасный дефолт (dark). */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return { theme: 'dark', setTheme: () => {}, toggle: () => {} };
  }
  return ctx;
}
