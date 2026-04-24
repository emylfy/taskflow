import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { Button } from '@/components/ui/Button';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import styles from './chat.module.css';

export const metadata = { title: 'Чат проекта — TaskFlow' };

type Msg = {
  who: string;
  time: string;
  text: string;
  pinned?: boolean;
  thread?: number;
  reactions?: { e: string; n: number }[];
};

const CHANNELS = [
  { t: 'общий', n: 0, a: false },
  { t: 'разработка', n: 3, a: true },
  { t: 'дизайн', n: 0, a: false },
  { t: 'маркетинг', n: 0, a: false },
  { t: 'тестирование', n: 1, a: false },
];

const MESSAGES: Msg[] = [
  { who: 'Сергей Николаев', time: '14:02', text: 'Запустил сборку на стенде. Деплой через 10 минут будет.' },
  { who: 'Мария Петрова', time: '14:08', text: 'Подложила иконки в репозиторий, ветка icons-pack. Можно подтягивать.', reactions: [{ e: '👍', n: 2 }] },
  { who: 'Сергей Николаев', time: '14:11', text: 'Принял. Перенесу к себе после деплоя.' },
  { who: 'Иван Соколов', time: '14:23', text: 'Ребята, встреча по ретро в 16:00 в переговорке «Нева». Напоминаю.', pinned: true },
  { who: 'Елена Куликова', time: '14:38', text: 'А можно проверить ссылку на тарифы? Кажется, редирект не работает.', thread: 3 },
  { who: 'Сергей Николаев', time: '14:40', text: 'Сейчас проверю — это после последнего мержа, видимо.', reactions: [{ e: '🙏', n: 1 }] },
];

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await params;
  return (
    <div className={styles.layout}>
      <aside className={styles.sidePanel}>
        <div className={styles.projectHead}>
          <ProjectIcon name="Редизайн сайта" size={28} />
          <div>
            <div className={styles.projectName}>Редизайн сайта</div>
            <div className={styles.projectSub}>Чат проекта</div>
          </div>
        </div>
        <div className={styles.groupTitle}>Каналы</div>
        {CHANNELS.map((c) => (
          <div key={c.t} className={`${styles.channel} ${c.a ? styles.channelActive : ''}`}>
            <I.Hash size={14} stroke={c.a ? '#2B5FA4' : '#8B939C'} />
            <span style={{ flex: 1 }}>{c.t}</span>
            {c.n > 0 && <span className={styles.badge}>{c.n}</span>}
          </div>
        ))}
        <div className={styles.groupTitle}>Личные</div>
        {['Мария Петрова', 'Елена Куликова', 'Сергей Николаев'].map((n) => (
          <div key={n} className={styles.dm}>
            <div className={styles.avatarOnline}>
              <Avatar name={n} size={22} />
              <span className={styles.online} />
            </div>
            <span>{n}</span>
          </div>
        ))}
      </aside>

      <section className={styles.messages}>
        <div className={styles.channelHead}>
          <I.Hash size={16} stroke="#1A1D23" />
          <div className={styles.channelName}>разработка</div>
          <div className={styles.channelMeta}>· 8 участников · канал проекта «Редизайн сайта»</div>
          <div style={{ flex: 1 }} />
          <AvatarStack names={['Сергей Николаев', 'Мария Петрова', 'Иван Соколов', 'Елена Куликова']} size={24} max={4} />
        </div>

        <div className={styles.stream}>
          <div className={styles.daySep}>
            <span>Сегодня · 29 апреля</span>
          </div>
          {MESSAGES.map((m, i) => (
            <div key={i} className={styles.msg}>
              <Avatar name={m.who} size={36} />
              <div className={styles.msgBody}>
                <div className={styles.msgHead}>
                  <span className={styles.msgWho}>{m.who}</span>
                  <span className={styles.msgTime}>{m.time}</span>
                  {m.pinned && <span className={styles.pinned}>ЗАКРЕПЛЕНО</span>}
                </div>
                <div className={styles.msgText}>{m.text}</div>
                {m.reactions && (
                  <div className={styles.reactions}>
                    {m.reactions.map((r) => (
                      <span key={r.e} className={styles.reaction}>
                        {r.e} {r.n}
                      </span>
                    ))}
                  </div>
                )}
                {m.thread && (
                  <div className={styles.thread}>
                    <AvatarStack names={['Сергей Николаев', 'Мария Петрова']} size={16} max={2} />
                    {m.thread} ответа в треде
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.composer}>
          <div className={styles.composerInput} contentEditable suppressContentEditableWarning>
            Обновил ссылку на тарифы, проверьте, пожалуйста
          </div>
          <div className={styles.composerToolbar}>
            <I.Paperclip size={15} stroke="#5B6670" />
            <I.Smile size={15} stroke="#5B6670" />
            <I.Bold size={15} stroke="#5B6670" />
            <div style={{ flex: 1 }} />
            <Button variant="primary" size="sm" leading={<I.Send size={13} stroke="#fff" />}>
              Отправить
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
