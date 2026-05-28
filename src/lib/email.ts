import nodemailer from 'nodemailer';

// Транспорт создаётся лениво и только если SMTP_HOST задан, чтобы при
// отсутствии переменных окружения отправка не падала, а просто молча
// фолбэчила в console.log (полезно в DEMO_MODE и в локальной разработке).
let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getTransporter(): Promise<nodemailer.Transporter> | null {
  // Нужны и хост, и пароль — иначе (хост-плейсхолдер с пустым паролем) nodemailer
  // упадёт на авторизации. В этом случае молча фолбэчим в console.log.
  if (!process.env.SMTP_HOST || !process.env.SMTP_PASSWORD) return null;
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: Number(process.env.SMTP_PORT ?? 465) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      })
    );
  }
  return transporterPromise;
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(msg: EmailMessage): Promise<{ delivered: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:dry-run] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { delivered: false, reason: 'SMTP_HOST не задан' };
  }
  try {
    const transporter = await t;
    await transporter.sendMail({
      from: process.env.SMTP_USER ?? 'noreply@taskflow.ru',
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? msg.text,
    });
    return { delivered: true };
  } catch (err) {
    console.error('[email:error]', err);
    return { delivered: false, reason: String(err) };
  }
}
