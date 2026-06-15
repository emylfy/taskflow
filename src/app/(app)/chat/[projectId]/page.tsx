import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { Composer } from '@/components/chat/Composer';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { listChatMessages } from '@/server/actions/chat';
import { getUserTimezone } from '@/lib/datetime';
import styles from './chat.module.css';

export const metadata = { title: 'Чат проекта — TaskFlow' };
export const dynamic = 'force-dynamic';

function formatTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
}

function dayLabel(d: Date, tz: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return `Сегодня · ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', timeZone: tz })}`;
  if (sameDay(d, yesterday)) return `Вчера · ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', timeZone: tz })}`;
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: '2-digit', month: 'long', timeZone: tz });
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const tz = await getUserTimezone(user.id);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: {
          projects: { orderBy: { name: 'asc' } },
          members: {
            include: { user: { select: { id: true, name: true } } },
            take: 8,
          },
        },
      },
    },
  });
  if (!project) notFound();

  // Проверяем доступ.
  const access = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: project.organizationId } },
  });
  if (!access) notFound();

  const rawMessages = await listChatMessages(projectId, 200);
  const messages = rawMessages.slice().reverse(); // от старых к новым

  const otherMembers = project.organization.members.filter((m) => m.user.id !== user.id);

  // Группируем сообщения по дням для отрисовки разделителей.
  type DayBucket = { day: string; date: Date; items: typeof messages };
  const buckets: DayBucket[] = [];
  for (const m of messages) {
    const label = dayLabel(m.createdAt, tz);
    const last = buckets[buckets.length - 1];
    if (last && last.day === label) last.items.push(m);
    else buckets.push({ day: label, date: m.createdAt, items: [m] });
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidePanel}>
        <div className={styles.projectHead}>
          <ProjectIcon name={project.name} size={28} />
          <div>
            <div className={styles.projectName}>{project.name}</div>
            <div className={styles.projectSub}>Чат проекта</div>
          </div>
        </div>
        <div className={styles.groupTitle}>Проекты</div>
        {project.organization.projects.map((p) => (
          <Link
            key={p.id}
            href={`/chat/${p.id}`}
            className={`${styles.channel} ${p.id === projectId ? styles.channelActive : ''}`}
          >
            <I.Hash size={14} stroke={p.id === projectId ? '#2B5FA4' : '#8B939C'} />
            <span style={{ flex: 1 }}>{p.name}</span>
          </Link>
        ))}
        {otherMembers.length > 0 ? (
          <>
            <div className={styles.groupTitle}>Участники</div>
            {otherMembers.map((m) => (
              <div key={m.user.id} className={styles.dm}>
                <div className={styles.avatarOnline}>
                  <Avatar name={m.user.name} size={22} />
                  <span className={styles.online} />
                </div>
                <span>{m.user.name}</span>
              </div>
            ))}
          </>
        ) : null}
      </aside>

      <section className={styles.messages}>
        <div className={styles.channelHead}>
          <I.Hash size={16} stroke="#1A1D23" />
          <div className={styles.channelName}>{project.name.toLowerCase()}</div>
          <div className={styles.channelMeta}>
            · {project.organization.members.length} участников · канал проекта «{project.name}»
          </div>
          <div style={{ flex: 1 }} />
          <AvatarStack
            names={project.organization.members.slice(0, 4).map((m) => m.user.name)}
            size={24}
            max={4}
          />
        </div>

        <div className={styles.stream}>
          {buckets.length === 0 ? (
            <div style={{ padding: 24, color: '#5B6670', textAlign: 'center' }}>
              Сообщений пока нет — напишите первое.
            </div>
          ) : null}
          {buckets.map((b) => (
            <React.Fragment key={b.day}>
              <div className={styles.daySep}>
                <span>{b.day}</span>
              </div>
              {b.items.map((m) => (
                <div key={m.id} className={styles.msg}>
                  <Avatar name={m.author.name} size={36} />
                  <div className={styles.msgBody}>
                    <div className={styles.msgHead}>
                      <span className={styles.msgWho}>{m.author.name}</span>
                      <span className={styles.msgTime}>{formatTime(m.createdAt, tz)}</span>
                    </div>
                    <div className={styles.msgText}>{m.content}</div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        <Composer projectId={projectId} />
      </section>
    </div>
  );
}
