-- AlterTable: Task.labels (String[] @default([])) был в schema.prisma, но не
-- попал ни в одну миграцию (дрейф). На чистом `migrate deploy` колонки не было,
-- и любой запрос Task (доска, «Мои задачи», карточка) падал с P2022.
-- IF NOT EXISTS — идемпотентность для серверов, где колонка уже добавлена
-- вручную через `prisma db push`.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
