'use client';

import * as React from 'react';
import { useTheme } from './ThemeProvider';
import styles from './ThemeToggle.module.css';

/**
 * Переключатель светлой/тёмной темы. Иконки рисуются currentColor, поэтому сами
 * подстраиваются под тему. Показываем иконку целевой темы: в тёмной — солнце
 * (клик → светлая), в светлой — луна (клик → тёмная).
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggle}
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default ThemeToggle;
