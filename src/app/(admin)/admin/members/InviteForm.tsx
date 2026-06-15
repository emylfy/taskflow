'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { inviteMember } from '@/server/actions/members';
import type { MemberRole } from '@prisma/client';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" disabled={pending} leading={<I.Plus size={14} stroke="#fff" />}>
      {pending ? 'Приглашаем…' : 'Пригласить'}
    </Button>
  );
}

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setError(null);
        setOk(null);
        try {
          const email = String(fd.get('email') ?? '');
          const role = (String(fd.get('role') ?? 'MEMBER') as MemberRole) ?? 'MEMBER';
          const res = await inviteMember({ organizationId, email, role });
          const MSG: Record<string, string> = {
            already: `${email} уже в этой команде — роль обновлена`,
            registered: `${email} уже зарегистрирован — добавлен в команду`,
            pending: `${email} приглашали ранее (ещё не входил) — оставлен в команде`,
            new: `Новый участник ${email} добавлен. Войдёт под этим email (ссылка на почту или Яндекс)`,
          };
          setOk(MSG[res.status] ?? `Приглашение отправлено на ${email}`);
          formRef.current?.reset();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
      style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <Input name="email" type="email" required label="Email участника" placeholder="user@example.ru" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, color: '#5B6670', marginBottom: 6 }}>Роль</label>
        <select
          name="role"
          defaultValue="MEMBER"
          style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #D8DCE0', borderRadius: 8, background: '#fff' }}
        >
          <option value="MEMBER">Участник</option>
          <option value="ADMIN">Администратор</option>
        </select>
      </div>
      <SubmitBtn />
      {error ? <div style={{ width: '100%', color: '#B23A3A', fontSize: 13 }}>{error}</div> : null}
      {ok ? <div style={{ width: '100%', color: '#2E7D3E', fontSize: 13 }}>{ok}</div> : null}
      <div style={{ width: '100%', fontSize: 12, color: '#8B939C', marginTop: 2 }}>
        Введите email человека и роль — он станет участником сразу. Доступ откроется,
        как только он войдёт под этим email (по ссылке на почту или через Яндекс ID).
      </div>
    </form>
  );
}
