import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import styles from './admin.module.css';

export const metadata = { title: 'Администрирование — TaskFlow' };

const LOGS = [
  { who: 'Мария Петрова', t: '14:08', a: 'обновила описание задачи', x: 'Подготовить макеты главной страницы' },
  { who: 'Тимур Белов', t: '13:40', a: 'пригласил участника', x: 'a.volkova@taskflow.ru' },
  { who: 'Сергей Николаев', t: '12:22', a: 'завершил задачу', x: 'Подключение ЮKassa: боевая среда' },
  { who: 'Елена Куликова', t: '11:55', a: 'создала проект', x: 'Документация и обучение' },
  { who: 'Иван Соколов', t: '10:12', a: 'изменил роль участника', x: 'Мария Петрова → Администратор' },
  { who: 'Тимур Белов', t: '09:04', a: 'оплатил тариф', x: 'Команда, 1 500 ₽ на месяц' },
];

const DAYS = [32, 28, 40, 35, 45, 50, 42, 55, 60, 52, 58, 65, 70, 62, 68, 75, 72, 80, 78, 85, 82, 90, 88, 95, 92, 98, 94, 102, 100, 108];

export default function AdminDashboardPage() {
  const mx = Math.max(...DAYS);
  const mn = Math.min(...DAYS);
  const pts = DAYS.map((v, i) => `${(i / (DAYS.length - 1)) * 100},${100 - ((v - mn) / (mx - mn)) * 90 - 5}`).join(' ');

  return (
    <div className={styles.wrap}>
      <Sidebar active="settings" />
      <div className={styles.column}>
        <TopBar title="Администрирование" />
        <main className={styles.main}>
          <h1>Администрирование TaskFlow</h1>
          <p className={styles.lead}>Организация «Команда TaskFlow» · Тариф «Команда» · Продлён до 30 мая 2026</p>

          <div className={styles.metrics}>
            <Metric icon={<I.Users size={16} />} label="Активных пользователей" value="24" delta="+3 за неделю" color="#2B5FA4" />
            <Metric icon={<I.Folder size={16} />} label="Проектов" value="12" delta="+2 за неделю" color="#2E7D3E" />
            <Metric icon={<I.CheckCircle size={16} />} label="Задач за неделю" value="186" delta="+34 к прошлой" color="#8A6A12" />
            <Metric icon={<I.Archive size={16} />} label="Использовано хранилища" value="3,2 ГБ" delta="из 20 ГБ (16 %)" color="#7B3F6B" />
          </div>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <div className={styles.cardTitle}>Активность за 30 дней</div>
                  <div className={styles.cardSub}>Созданные и завершённые задачи по дням</div>
                </div>
                <div style={{ flex: 1 }} />
                <div className={styles.legend}>
                  <span>
                    <span className={styles.legendLine} style={{ background: '#2B5FA4' }} />
                    Задачи
                  </span>
                  <span>
                    <span className={styles.legendLine} style={{ background: '#2E7D3E' }} />
                    Завершено
                  </span>
                </div>
              </div>
              <div className={styles.chart}>
                <svg width="100%" height="220" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gd" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#2B5FA4" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#2B5FA4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`0,100 ${pts} 100,100`} fill="url(#gd)" />
                  <polyline points={pts} fill="none" stroke="#2B5FA4" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className={styles.chartX}>
                  <span>1 апр</span>
                  <span>8</span>
                  <span>15</span>
                  <span>22</span>
                  <span>29 апр</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Последние действия</div>
                <div style={{ flex: 1 }} />
                <span className={styles.link}>Журнал →</span>
              </div>
              <div className={styles.logs}>
                {LOGS.map((l) => (
                  <div key={l.who + l.t} className={styles.log}>
                    <Avatar name={l.who} size={26} />
                    <div className={styles.logInfo}>
                      <div className={styles.logTop}>
                        <span className={styles.logWho}>{l.who}</span>{' '}
                        <span className={styles.logAction}>{l.a}</span>
                      </div>
                      <div className={styles.logTarget}>{l.x}</div>
                    </div>
                    <div className={styles.logTime}>{l.t}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, delta, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  color: string;
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricHead}>
        <div className={styles.metricIcon} style={{ background: color + '1a', color }}>
          {icon}
        </div>
        <div className={styles.metricLabel}>{label}</div>
      </div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricDelta}>
        <I.TrendUp size={13} stroke="#2E7D3E" />
        {delta}
      </div>
    </div>
  );
}
