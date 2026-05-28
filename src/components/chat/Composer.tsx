'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { sendChatMessage } from '@/server/actions/chat';
import styles from '../../app/(app)/chat/[projectId]/chat.module.css';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="primary"
      size="sm"
      type="submit"
      disabled={pending}
      leading={<I.Send size={13} stroke="#fff" />}
    >
      {pending ? 'Отправка…' : 'Отправить'}
    </Button>
  );
}

export function Composer({ projectId }: { projectId: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await sendChatMessage(fd);
        formRef.current?.reset();
        inputRef.current?.focus();
      }}
      className={styles.composer}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        ref={inputRef}
        name="content"
        className={styles.composerInput}
        placeholder="Напишите сообщение и нажмите Enter…"
        rows={2}
        required
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        style={{
          width: '100%',
          resize: 'none',
          border: 0,
          outline: 'none',
          font: 'inherit',
          background: 'transparent',
          minHeight: 36,
        }}
      />
      <div className={styles.composerToolbar}>
        <span style={{ fontSize: 12, color: '#8B939C' }}>Enter — отправить, Shift+Enter — новая строка</span>
        <div style={{ flex: 1 }} />
        <SubmitButton />
      </div>
    </form>
  );
}
