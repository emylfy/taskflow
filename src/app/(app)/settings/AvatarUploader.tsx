'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { updateAvatar } from '@/server/actions/profile';
import styles from './settings.module.css';

const MAX_BYTES = 512 * 1024; // 512 КБ
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Загрузка аватара с понятными ошибками. Раньше форма постила файл прямо в
// server action, и при слишком большом/неверном файле экшен падал «молча»
// (в проде сообщение об ошибке server action скрывается) — выглядело как
// «загрузка не работает». Теперь проверяем файл на клиенте и показываем причину.
export function AvatarUploader() {
  const router = useRouter();
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get('avatar');
    if (!(file instanceof File) || file.size === 0) {
      setError('Сначала выберите файл изображения');
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError('Допустимы изображения JPEG, PNG, WEBP или GIF');
      return;
    }
    if (file.size > MAX_BYTES) {
      const kb = Math.round(file.size / 1024);
      setError(`Файл ${kb} КБ — это больше 512 КБ. Выберите изображение поменьше.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateAvatar(fd);
      setFileName(null);
      form.reset();
      router.refresh();
    } catch {
      setError('Не удалось загрузить изображение. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}
    >
      <label className={styles.fileButton}>
        <I.Image size={14} />
        {fileName ? 'Выбрать другой' : 'Выбрать файл'}
        <input
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={styles.fileInput}
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null);
            setError(null);
          }}
        />
      </label>
      <Button variant="secondary" type="submit" disabled={busy}>
        {busy ? 'Загрузка…' : 'Загрузить'}
      </Button>
      {fileName ? <span style={{ fontSize: 12, color: '#5B6670' }}>{fileName}</span> : null}
      {error ? <span style={{ fontSize: 12, color: '#B23A3A', width: '100%' }}>{error}</span> : null}
    </form>
  );
}

export default AvatarUploader;
