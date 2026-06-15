'use client';

import * as React from 'react';
import { requestAccountDeletion } from '@/server/actions/profile';

// Блок «Удаление аккаунта»: отправляет заявку на удаление (152-ФЗ) письмом
// оператору и подтверждение пользователю. Реального стирания не делаем —
// безопасно для целостности данных и организаций.
export function AccountDangerZone() {
  const [state, setState] = React.useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function onDelete() {
    if (!confirm('Отправить заявку на удаление аккаунта и персональных данных?')) return;
    setState('busy');
    setError(null);
    try {
      await requestAccountDeletion();
      setState('done');
    } catch {
      setState('idle');
      setError('Не удалось отправить заявку. Попробуйте позже.');
    }
  }

  return (
    <div
      style={{
        marginTop: 28,
        padding: 16,
        border: '1px solid #F0D2D2',
        borderRadius: 12,
        background: '#FCF6F6',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#B23A3A', marginBottom: 4 }}>
        Удаление аккаунта
      </div>
      <div style={{ fontSize: 13, color: '#5B6670', marginBottom: 12 }}>
        Заявка на удаление учётной записи и персональных данных (в соответствии с 152-ФЗ).
        Мы подтвердим обращение письмом и обработаем его.
      </div>
      {state === 'done' ? (
        <div style={{ fontSize: 13, color: '#2E7D3E' }}>
          Заявка отправлена. Подтверждение придёт на вашу почту.
        </div>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          disabled={state === 'busy'}
          style={{
            fontSize: 13,
            fontWeight: 500,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #E0A9A9',
            background: '#fff',
            color: '#B23A3A',
            cursor: 'pointer',
          }}
        >
          {state === 'busy' ? 'Отправляем…' : 'Удалить аккаунт'}
        </button>
      )}
      {error ? <div style={{ fontSize: 12, color: '#B23A3A', marginTop: 8 }}>{error}</div> : null}
    </div>
  );
}

export default AccountDangerZone;
