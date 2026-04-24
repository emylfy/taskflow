'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/Icons';
import { addComment } from '@/server/actions/comments';
import styles from './CommentList.module.css';

export type CommentItem = {
  id: string;
  author: string;
  text: string;
  timeLabel: string;
};

type CommentListProps = {
  taskId: string;
  currentUser: string;
  initialComments: CommentItem[];
};

export const CommentList: React.FC<CommentListProps> = ({ taskId, currentUser, initialComments }) => {
  const [items, setItems] = React.useState(initialComments);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);

  async function onSend() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const saved = await addComment({ taskId, content: draft });
      setItems((prev) => [
        ...prev,
        {
          id: saved.id,
          author: currentUser,
          text: saved.content,
          timeLabel: 'только что',
        },
      ]);
      setDraft('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        Комментарии · {items.length}
        <div style={{ flex: 1 }} />
        <span className={styles.sort}>Сортировка: новые внизу</span>
      </div>

      <div className={styles.list}>
        {items.map((c) => (
          <div key={c.id} className={styles.item}>
            <Avatar name={c.author} size={32} />
            <div className={styles.content}>
              <div className={styles.meta}>
                <span className={styles.author}>{c.author}</span>
                <span className={styles.time}>{c.timeLabel}</span>
              </div>
              <div className={styles.text}>{renderMentions(c.text)}</div>
              <div className={styles.actions}>
                <span className={styles.action}>
                  <I.Reply size={12} stroke="#8B939C" />
                  Ответить
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.composer}>
        <div className={styles.composerHead}>
          <Avatar name={currentUser} size={26} />
          <textarea
            className={styles.textarea}
            placeholder="Напишите комментарий, используйте @ для упоминания"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
        </div>
        <div className={styles.composerToolbar}>
          <I.Bold size={14} stroke="#5B6670" />
          <I.Italic size={14} stroke="#5B6670" />
          <I.ListOl size={14} stroke="#5B6670" />
          <span className={styles.vsep} />
          <I.Paperclip size={14} stroke="#5B6670" />
          <I.Smile size={14} stroke="#5B6670" />
          <div style={{ flex: 1 }} />
          <Button
            variant="primary"
            size="sm"
            leading={<I.Send size={13} stroke="#fff" />}
            onClick={onSend}
            disabled={sending || !draft.trim()}
          >
            {sending ? 'Отправка…' : 'Отправить'}
          </Button>
        </div>
      </div>
    </div>
  );
};

function renderMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[а-яА-ЯёЁa-zA-Z0-9_-]+)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className={styles.mention}>
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

export default CommentList;
