'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/lib/use-media-query';

type MobileNavContextValue = {
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggle: () => void;
};

const MobileNavContext = React.createContext<MobileNavContextValue | null>(null);

/**
 * Хранит состояние мобильного бокового меню (off-canvas drawer) и делит его
 * между бургером в TopBar и самим Sidebar. Авто-закрывается при переходе между
 * страницами и при расширении экрана до десктопа.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const isDesktop = useMediaQuery('(min-width: 769px)');

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  const value = React.useMemo<MobileNavContextValue>(
    () => ({
      open,
      openNav: () => setOpen(true),
      closeNav: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
    }),
    [open],
  );

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

/**
 * Доступ к состоянию drawer. Вне провайдера возвращает безопасные no-op —
 * Sidebar/TopBar не падают, если вдруг отрендерены отдельно.
 */
export function useMobileNav(): MobileNavContextValue {
  const ctx = React.useContext(MobileNavContext);
  if (!ctx) {
    return { open: false, openNav: () => {}, closeNav: () => {}, toggle: () => {} };
  }
  return ctx;
}
