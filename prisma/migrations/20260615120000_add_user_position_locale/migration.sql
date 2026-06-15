-- AlterTable: добавляем поля профиля, которые были в schema.prisma, но не
-- попали ни в одну миграцию (дрейф). Без них любой запрос User падает с P2022.
-- IF NOT EXISTS — чтобы migrate deploy не падал на серверах, где колонки уже
-- были добавлены вручную через `prisma db push` (идемпотентность).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'ru';
