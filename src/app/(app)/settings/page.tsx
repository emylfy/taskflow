import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { updateProfile } from '@/server/actions/profile';
import styles from './settings.module.css';

export const metadata = { title: 'Настройки профиля — TaskFlow' };
export const dynamic = 'force-dynamic';

const MENU = [
  { icon: <I.User size={16} />, label: 'Профиль', active: true },
  { icon: <I.Bell size={16} />, label: 'Уведомления', href: '/notifications' },
  { icon: <I.CreditCard size={16} />, label: 'Подписка', href: '/admin/billing' },
];

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

export default async function SettingsPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, timezone: true },
  });
  const profile = dbUser ?? {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    timezone: 'Europe/Moscow',
  };

  const accounts = await prisma.account.findMany({
    where: { userId: profile.id },
    select: { providerId: true },
  });
  const hasYandex = accounts.some((a) => a.providerId === 'yandex');
  const hasMagic = accounts.some((a) => a.providerId === 'magic-link') || !hasYandex;

  return (
    <div className={styles.layout}>
      <aside className={styles.menu}>
        <div className={styles.menuTitle}>Настройки</div>
        {MENU.map((m) =>
          m.href ? (
            <a key={m.label} href={m.href} className={styles.item}>
              {m.icon}
              {m.label}
            </a>
          ) : (
            <div key={m.label} className={`${styles.item} ${m.active ? styles.itemActive : ''}`}>
              {m.icon}
              {m.label}
            </div>
          )
        )}
      </aside>

      <div className={styles.main}>
        <div className={styles.maxW}>
          <h1>Профиль</h1>
          <p className={styles.lead}>Эти данные увидят участники ваших проектов.</p>

          <form action={updateProfile}>
            <div className={styles.photoCard}>
              <Avatar name={profile.name || profile.email} size={72} />
              <div style={{ flex: 1 }}>
                <div className={styles.photoTitle}>Ваш аватар</div>
                <div className={styles.photoHint}>
                  Генерируется автоматически из имени. Загрузка фото появится в следующей версии.
                </div>
              </div>
            </div>

            <Input name="name" label="Имя и фамилия" defaultValue={profile.name} required />
            <div style={{ height: 14 }} />
            <Input
              label="Электронная почта"
              defaultValue={profile.email}
              readOnly
              hint="Изменение email требует подтверждения по новому адресу — функция планируется."
            />
            <div style={{ height: 14 }} />

            <label style={{ display: 'block', fontSize: 13, color: '#5B6670', marginBottom: 6 }}>
              Часовой пояс
            </label>
            <select
              name="timezone"
              defaultValue={profile.timezone}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '1px solid #D8DCE0',
                borderRadius: 8,
                background: '#fff',
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>

            <div className={styles.loginCard}>
              <div className={styles.loginTitle}>Способы входа в аккаунт</div>
              <div className={styles.loginRow}>
                <span className={`${styles.radio} ${hasYandex ? styles.radioOn : ''}`}>
                  {hasYandex && <span className={styles.radioDot} />}
                </span>
                <span className={styles.loginName}>Яндекс ID</span>
                <span className={styles.loginDesc}>· {hasYandex ? 'привязан' : 'не привязан'}</span>
              </div>
              <div className={styles.loginRow}>
                <span className={`${styles.radio} ${hasMagic ? styles.radioOn : ''}`}>
                  {hasMagic && <span className={styles.radioDot} />}
                </span>
                <span className={styles.loginName}>Ссылка на почту</span>
                <span className={styles.loginDesc}>· одноразовая ссылка для входа</span>
              </div>
            </div>

            <div className={styles.saveRow}>
              <Button variant="primary" type="submit">
                Сохранить
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
