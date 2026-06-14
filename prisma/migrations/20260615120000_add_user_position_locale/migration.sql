-- AlterTable: добавляем поля профиля, которые были в schema.prisma, но не
-- попали ни в одну миграцию (дрейф). Без них любой запрос User падает с P2022.
ALTER TABLE "User" ADD COLUMN     "position" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ru';
