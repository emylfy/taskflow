import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { updateProfile, removeAvatar } from '@/server/actions/profile';
import { AvatarUploader } from './AvatarUploader';
import { LoginMethods } from './LoginMethods';
import { AccountDangerZone } from './AccountDangerZone';
import styles from './settings.module.css';

export const metadata = { title: 'Настройки профиля — TaskFlow' };
export const dynamic = 'force-dynamic';

// «Профиль» — единственный раздел настроек, он отображается на этой странице.
// Остальное — это переходы в связанные страницы приложения (а не вкладки
// настроек), поэтому выносим их в отдельный блок и помечаем стрелкой.
const RELATED = [
  { icon: <I.Bell size={16} />, label: 'Все уведомления', href: '/notifications' },
  { icon: <I.CreditCard size={16} />, label: 'Тарифы и оплата', href: '/admin/billing' },
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

// Интерфейс пока только на русском. English оставляем в списке, но недоступным
// («скоро») — честно, без нерабочего переключения.
const LANGUAGES: { value: string; label: string; disabled?: boolean }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English — скоро', disabled: true },
];

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text)',
};

export default async function SettingsPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, timezone: true, image: true, position: true, locale: true },
  });
  const profile = dbUser ?? {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    timezone: 'Europe/Moscow',
    image: null as string | null,
    position: null as string | null,
    locale: 'ru',
  };
  const [firstName, ...restName] = (profile.name ?? '').trim().split(/\s+/);
  const lastName = restName.join(' ');

  const accounts = await prisma.account.findMany({
    where: { userId: profile.id },
    select: { providerId: true },
  });
  const hasYandex = accounts.some((a) => a.providerId === 'yandex');

  // Привязка Яндекса доступна, только если OAuth настроен на сервере и это не
  // демо-вход (демо не создаёт сессию better-auth — привязывать нечего).
  const yandexEnabled = !!process.env.YANDEX_CLIENT_ID && !!process.env.YANDEX_CLIENT_SECRET;
  const cookieStore = await cookies();
  const isDemo = !!cookieStore.get('tf-demo-user')?.value;

  return (
    <div className={styles.layout}>
      <aside className={styles.menu}>
        <div className={styles.menuTitle}>Настройки</div>
        <div className={`${styles.item} ${styles.itemActive}`}>
          <I.User size={16} />
          Профиль
        </div>
        <div
          style={{
            margin: '14px 8px 6px',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            color: '#8B939C',
          }}
        >
          Связанные разделы
        </div>
        {RELATED.map((m) => (
          <a key={m.label} href={m.href} className={styles.item}>
            {m.icon}
            {m.label}
            <span style={{ marginLeft: 6, color: '#8B939C' }}>›</span>
          </a>
        ))}
      </aside>

      <div className={styles.main}>
        <div className={styles.maxW}>
          <h1>Профиль</h1>
          <p className={styles.lead}>Эти данные увидят участники ваших проектов.</p>

          <div className={styles.photoCard}>
            <Avatar name={profile.name || profile.email} size={72} src={profile.image} />
            <div style={{ flex: 1 }}>
              <div className={styles.photoTitle}>Ваш аватар</div>
              <div className={styles.photoHint}>JPEG, PNG, WEBP или GIF, до 512 КБ.</div>
              <AvatarUploader />
              {profile.image && (
                <form action={removeAvatar} style={{ marginTop: 6 }}>
                  <button
                    type="submit"
                    style={{ background: 'none', border: 'none', color: '#B23A3A', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  >
                    Удалить фото
                  </button>
                </form>
              )}
            </div>
          </div>

          <form action={updateProfile}>
            <div className={styles.grid2}>
              <Input name="firstName" label="Имя" defaultValue={firstName ?? ''} required />
              <Input name="lastName" label="Фамилия" defaultValue={lastName} />
            </div>
            <div style={{ height: 14 }} />
            <Input
              label="Электронная почта"
              defaultValue={profile.email}
              readOnly
              hint="Изменение email требует подтверждения по новому адресу — функция планируется."
            />
            <div style={{ height: 14 }} />
            <Input
              name="position"
              label="Должность"
              defaultValue={profile.position ?? ''}
              placeholder="Например, продуктовый дизайнер"
            />
            <div style={{ height: 14 }} />

            <div className={styles.grid2}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#5B6670', marginBottom: 6 }}>
                  Часовой пояс
                </label>
                <select name="timezone" defaultValue={profile.timezone} style={selectStyle}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#5B6670', marginBottom: 6 }}>
                  Язык интерфейса
                </label>
                <select
                  name="locale"
                  defaultValue={profile.locale === 'en' ? 'ru' : profile.locale ?? 'ru'}
                  style={selectStyle}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value} disabled={l.disabled}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <LoginMethods hasYandex={hasYandex} yandexEnabled={yandexEnabled} isDemo={isDemo} />

            <div className={styles.saveRow}>
              <Button variant="primary" type="submit">
                Сохранить
              </Button>
            </div>
          </form>

          <AccountDangerZone />
        </div>
      </div>
    </div>
  );
}
