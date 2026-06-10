'use client';

import * as React from 'react';

/**
 * Реактивно отслеживает CSS media-запрос. SSR-безопасно: на сервере и до
 * монтирования возвращает false, фактическое значение проставляется в эффекте.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Истинно на «мобильной» ширине (≤768px) — основной брейкпоинт каркаса. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
