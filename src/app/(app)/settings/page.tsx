import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './settings.module.css';

export const metadata = { title: 'Настройки профиля — TaskFlow' };

const MENU = [
  { icon: <I.User size={16} />, label: 'Профиль', active: true },
  { icon: <I.Bell size={16} />, label: 'Уведомления' },
  { icon: <I.Lock size={16} />, label: 'Безопасность' },
  { icon: <I.Plug size={16} />, label: 'Интеграции' },
  { icon: <I.CreditCard size={16} />, label: 'Подписка' },
];

const LOGIN_METHODS = [
  { t: 'Яндекс ID', d: 'привязан · ivan.sokolov@yandex.ru', active: true },
  { t: 'Ссылка на почту', d: 'одноразовая ссылка с кодом', active: false },
];

export default function SettingsPage() {
  return (
    <div className={styles.layout}>
      <aside className={styles.menu}>
        <div className={styles.menuTitle}>Настройки</div>
        {MENU.map((m) => (
          <div key={m.label} className={`${styles.item} ${m.active ? styles.itemActive : ''}`}>
            {m.icon}
            {m.label}
          </div>
        ))}
      </aside>

      <div className={styles.main}>
        <div className={styles.maxW}>
          <h1>Профиль</h1>
          <p className={styles.lead}>Эти данные увидят участники ваших проектов.</p>

          <div className={styles.photoCard}>
            <Avatar name="Иван Соколов" size={72} />
            <div style={{ flex: 1 }}>
              <div className={styles.photoTitle}>Ваша фотография</div>
              <div className={styles.photoHint}>PNG или JPG, минимум 200 × 200 px</div>
            </div>
            <Button variant="secondary" size="sm" leading={<I.Upload size={14} stroke="#5B6670" />}>
              Загрузить
            </Button>
            <Button variant="ghost" size="sm">
              Удалить
            </Button>
          </div>

          <div className={styles.grid2}>
            <Input label="Имя" defaultValue="Иван" />
            <Input label="Фамилия" defaultValue="Соколов" />
          </div>
          <div style={{ height: 14 }} />
          <Input
            label="Электронная почта"
            defaultValue="ivan.sokolov@taskflow.ru"
            readOnly
            hint="Изменить адрес можно в настройках безопасности."
          />
          <div style={{ height: 14 }} />
          <Input label="Должность" defaultValue="Ведущий разработчик" />
          <div style={{ height: 14 }} />
          <div className={styles.grid2}>
            <Input label="Часовой пояс" defaultValue="Москва (UTC+3)" trailing={<I.ChevronDown size={14} stroke="#8B939C" />} />
            <Input label="Язык интерфейса" defaultValue="Русский" trailing={<I.ChevronDown size={14} stroke="#8B939C" />} />
          </div>

          <div className={styles.loginCard}>
            <div className={styles.loginTitle}>Предпочитаемый способ входа</div>
            {LOGIN_METHODS.map((m) => (
              <label key={m.t} className={styles.loginRow}>
                <span className={`${styles.radio} ${m.active ? styles.radioOn : ''}`}>
                  {m.active && <span className={styles.radioDot} />}
                </span>
                <span className={styles.loginName}>{m.t}</span>
                <span className={styles.loginDesc}>· {m.d}</span>
              </label>
            ))}
          </div>

          <div className={styles.saveRow}>
            <Button variant="primary">Сохранить</Button>
            <Button variant="secondary">Отмена</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
