import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import styles from './members.module.css';

export const metadata = { title: 'Участники — TaskFlow' };

type Member = {
  name: string;
  email: string;
  role: string;
  roleColor: string;
  roleBg: string;
  joined: string;
  activity: string;
  you?: boolean;
  pending?: boolean;
};

const MEMBERS: Member[] = [
  { name: 'Иван Соколов', email: 'ivan.sokolov@taskflow.ru', role: 'Владелец', roleColor: '#7B3F6B', roleBg: '#F3E8F0', joined: '12 янв 2026', activity: 'сейчас', you: true },
  { name: 'Мария Петрова', email: 'maria.petrova@taskflow.ru', role: 'Администратор', roleColor: '#2B5FA4', roleBg: '#E8EEF7', joined: '15 янв 2026', activity: '2 мин назад' },
  { name: 'Сергей Николаев', email: 'sergey.nikolaev@taskflow.ru', role: 'Участник', roleColor: '#5B6670', roleBg: '#EEF0F3', joined: '2 фев 2026', activity: '12 мин назад' },
  { name: 'Елена Куликова', email: 'elena.kulikova@taskflow.ru', role: 'Участник', roleColor: '#5B6670', roleBg: '#EEF0F3', joined: '10 фев 2026', activity: '1 ч назад' },
  { name: 'Тимур Белов', email: 'timur.belov@taskflow.ru', role: 'Администратор', roleColor: '#2B5FA4', roleBg: '#E8EEF7', joined: '20 фев 2026', activity: 'вчера' },
  { name: 'Анна Волкова', email: 'anna.volkova@taskflow.ru', role: 'Гость', roleColor: '#8A6A12', roleBg: '#FBF3DC', joined: 'приглашение ожидает', activity: '—', pending: true },
];

export default function MembersPage() {
  return (
    <div className={styles.wrap}>
      <Sidebar active="settings" />
      <div className={styles.column}>
        <TopBar title="Участники" />
        <main className={styles.main}>
          <div className={styles.head}>
            <div>
              <h1>Участники и подписка</h1>
              <p className={styles.sub}>6 участников · занято 6 из 20 мест по тарифу «Команда»</p>
            </div>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" leading={<I.Upload size={14} stroke="#5B6670" />}>
              Импорт CSV
            </Button>
            <Button variant="primary" leading={<I.Plus size={14} stroke="#fff" />}>
              Пригласить
            </Button>
          </div>

          <div className={styles.table}>
            <div className={styles.tableHead}>
              <div>Участник</div>
              <div>Роль</div>
              <div>Присоединился</div>
              <div>Активность</div>
              <div />
            </div>
            {MEMBERS.map((m, i) => (
              <div key={m.email} className={`${styles.row} ${m.pending ? styles.pending : ''}`}>
                <div className={styles.memberCell}>
                  <Avatar name={m.name} size={32} />
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {m.name}
                      {m.you && <span className={styles.badgeYou}>ВЫ</span>}
                      {m.pending && <span className={styles.badgePending}>ОЖИДАЕТ</span>}
                    </div>
                    <div className={styles.memberEmail}>{m.email}</div>
                  </div>
                </div>
                <div>
                  <span className={styles.roleChip} style={{ background: m.roleBg, color: m.roleColor }}>
                    {m.role}
                    <I.ChevronDown size={12} stroke={m.roleColor} />
                  </span>
                </div>
                <div className={styles.cellText}>{m.joined}</div>
                <div className={styles.cellText}>{m.activity}</div>
                <div>
                  <I.MoreH size={16} stroke="#8B939C" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
