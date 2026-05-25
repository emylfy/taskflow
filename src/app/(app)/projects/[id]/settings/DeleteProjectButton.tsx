'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { deleteProject } from '@/server/actions/projects';

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      variant="danger"
      size="sm"
      type="button"
      disabled={busy}
      leading={<I.Trash size={14} stroke="#B23A3A" />}
      onClick={async () => {
        const confirmation = window.prompt(
          `Введите название проекта «${projectName}» для подтверждения удаления.\nЭто действие необратимо — все задачи и комментарии проекта будут удалены.`
        );
        if (confirmation !== projectName) {
          if (confirmation !== null) alert('Название не совпадает, удаление отменено.');
          return;
        }
        setBusy(true);
        try {
          await deleteProject(projectId);
          router.push('/projects');
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
          setBusy(false);
        }
      }}
    >
      {busy ? 'Удаление…' : 'Удалить проект'}
    </Button>
  );
}
