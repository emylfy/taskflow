'use client';

import * as React from 'react';

// Аварийная граница для сбоев в корневом макете: здесь обычные стили могут быть
// недоступны, поэтому оформление задано инлайном, а компонент рендерит свой
// <html>/<body>. Срабатывает крайне редко.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F8FA',
          color: '#1A1D23',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            width: 460,
            maxWidth: '100%',
            background: '#FFFFFF',
            border: '1px solid #E4E6EA',
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
            Что-то пошло не так
          </h1>
          <p style={{ fontSize: 14, color: '#5B6670', lineHeight: 1.6, margin: '0 0 24px' }}>
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: 6,
              border: '1px solid transparent',
              background: '#2B5FA4',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
          {error.digest && (
            <div style={{ marginTop: 22, fontSize: 11, color: '#8B939C', fontFamily: 'monospace' }}>
              Код: {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
