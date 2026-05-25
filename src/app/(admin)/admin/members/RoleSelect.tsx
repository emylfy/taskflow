'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { changeMemberRole, removeMember } from '@/server/actions/members';
import type { MemberRole } from '@prisma/client';

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MEMBER: 'Участник',
};

const ROLE_STYLE: Record<MemberRole, { color: string; bg: string }> = {
  OWNER: { color: '#7B3F6B', bg: '#F3E8F0' },
  ADMIN: { color: '#2B5FA4', bg: '#E8EEF7' },
  MEMBER: { color: '#5B6670', bg: '#EEF0F3' },
};

export function RoleSelect({
  memberId,
  role,
  isOwner,
  isCurrentUser,
}: {
  memberId: string;
  role: MemberRole;
  isOwner: boolean;
  isCurrentUser: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const style = ROLE_STYLE[role];

  // Владельца нельзя понизить — рендерим только лейбл.
  if (isOwner) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          background: style.bg,
          color: style.color,
        }}
      >
        {ROLE_LABEL[role]}
      </span>
    );
  }

  return (
    <select
      value={role}
      disabled={busy || isCurrentUser}
      onChange={async (e) => {
        const next = e.target.value as MemberRole;
        if (next === role) return;
        setBusy(true);
        try {
          await changeMemberRole({ memberId, role: next });
          router.refresh();
        } catch (err) {
          alert((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: style.bg,
        color: style.color,
        border: 0,
        cursor: isCurrentUser ? 'not-allowed' : 'pointer',
      }}
      aria-label="Изменить роль"
    >
      <option value="ADMIN">Администратор</option>
      <option value="MEMBER">Участник</option>
    </select>
  );
}

export function RemoveButton({
  memberId,
  memberName,
  isOwner,
  isCurrentUser,
}: {
  memberId: string;
  memberName: string;
  isOwner: boolean;
  isCurrentUser: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  if (isOwner || isCurrentUser) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Удалить ${memberName} из организации?`)) return;
        setBusy(true);
        try {
          await removeMember(memberId);
          router.refresh();
        } catch (err) {
          alert((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#B23A3A', padding: 4 }}
      aria-label={`Удалить ${memberName}`}
    >
      Удалить
    </button>
  );
}
