import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { genericOAuth } from 'better-auth/plugins';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const smtp = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendMagicLink(email: string, url: string) {
  await smtp.sendMail({
    from: `"TaskFlow" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Вход в TaskFlow',
    text: `Для входа в TaskFlow перейдите по ссылке:\n${url}\n\nЕсли вы не запрашивали вход — проигнорируйте это сообщение.`,
    html: `<p>Для входа в TaskFlow перейдите по ссылке:</p>
           <p><a href="${url}">${url}</a></p>
           <p style="color:#5B6670;font-size:12px">Если вы не запрашивали вход — проигнорируйте это сообщение.</p>`,
  });
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
    genericOAuth({
      config: [
        {
          providerId: 'yandex',
          clientId: process.env.YANDEX_CLIENT_ID ?? '',
          clientSecret: process.env.YANDEX_CLIENT_SECRET ?? '',
          authorizationUrl: 'https://oauth.yandex.ru/authorize',
          tokenUrl: 'https://oauth.yandex.ru/token',
          userInfoUrl: 'https://login.yandex.ru/info',
          scopes: ['login:email', 'login:info'],
          mapProfileToUser: (profile) => ({
            name: (profile.real_name as string) ?? (profile.display_name as string) ?? 'Пользователь',
            email: (profile.default_email as string) ?? `${profile.id}@yandex.ru`,
            emailVerified: true,
          }),
        },
      ],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;
