import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { genericOAuth } from 'better-auth/plugins';
import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from './prisma';

let smtpTransporter: Transporter | null | undefined;
function getSmtp(): Transporter | null {
  if (smtpTransporter !== undefined) return smtpTransporter;
  // SMTP считаем настроенным только при заданных хосте И пароле. Иначе (например,
  // в .env стоит хост-плейсхолдер с пустым паролем) nodemailer пытается
  // авторизоваться и падает с «Missing credentials» — фолбэчим в консоль.
  if (!process.env.SMTP_HOST || !process.env.SMTP_PASSWORD) {
    smtpTransporter = null;
    return null;
  }
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return smtpTransporter;
}

async function sendMagicLink(email: string, url: string) {
  const smtp = getSmtp();
  if (!smtp) {
    // SMTP не настроен: не падаем, чтобы локальная разработка и DEMO_MODE
    // оставались работоспособными. Печатаем magic-link в консоль —
    // удобно для теста потока без поднятого почтового сервера.
    console.log(`[magic-link] ${email}\n  -> ${url}\n  (SMTP не настроен, письмо не отправлено)`);
    return;
  }
  try {
    await smtp.sendMail({
      from: `"TaskFlow" <${process.env.SMTP_USER ?? 'noreply@taskflow.ru'}>`,
      to: email,
      subject: 'Вход в TaskFlow',
      text: `Для входа в TaskFlow перейдите по ссылке:\n${url}\n\nЕсли вы не запрашивали вход — проигнорируйте это сообщение.`,
      html: `<p>Для входа в TaskFlow перейдите по ссылке:</p>
             <p><a href="${url}">${url}</a></p>
             <p style="color:#5B6670;font-size:12px">Если вы не запрашивали вход — проигнорируйте это сообщение.</p>`,
    });
  } catch (err) {
    // Проблема с SMTP не должна валить вход (better-auth иначе вернёт 500).
    // Логируем и оставляем ссылку в консоли — ею можно воспользоваться.
    console.error('[magic-link:error]', err);
    console.log(`[magic-link] ${email}\n  -> ${url}`);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
    // Яндекс OAuth подключаем только если ключи заданы — иначе попытка
    // авторизации без них приводит к невнятной ошибке от провайдера.
    ...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                providerId: 'yandex',
                clientId: process.env.YANDEX_CLIENT_ID,
                clientSecret: process.env.YANDEX_CLIENT_SECRET,
                authorizationUrl: 'https://oauth.yandex.ru/authorize',
                tokenUrl: 'https://oauth.yandex.ru/token',
                userInfoUrl: 'https://login.yandex.ru/info',
                scopes: ['login:email', 'login:info'],
                mapProfileToUser: (profile) => ({
                  name:
                    (profile.real_name as string) ?? (profile.display_name as string) ?? 'Пользователь',
                  email: (profile.default_email as string) ?? `${profile.id}@yandex.ru`,
                  emailVerified: true,
                }),
              },
            ],
          }),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;
