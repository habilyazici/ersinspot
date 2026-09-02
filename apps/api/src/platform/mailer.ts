/**
 * E-posta gönderimi.
 *
 * SMTP yapılandırılmamışsa (yerel geliştirme) e-postalar gönderilmez, log'a yazılır.
 * Bu, şifre sıfırlama akışını yerelde gerçek bir posta sunucusu olmadan test
 * edilebilir kılar.
 *
 * Gönderim başarısız olursa istisna fırlatılmaz: kullanıcının kaydı tamamlanmışken
 * e-posta sunucusundaki geçici bir arıza yüzünden işlemin geri alınması doğru değildir.
 * Hata loglanır ve akış devam eder.
 */

import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env, isTest } from './config/env.ts';
import { logger } from './observability/logger.ts';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

/** Testlerde gönderilen e-postaları incelemek için bellek içi kayıt. */
const sentInTest: EmailMessage[] = [];

/** SMTP yapılandırılmış mı? */
function isSmtpConfigured(): boolean {
  return (
    env.SMTP_HOST !== undefined &&
    env.SMTP_HOST !== '' &&
    env.SMTP_USER !== undefined &&
    env.SMTP_PASSWORD !== undefined
  );
}

/**
 * E-posta gönderir.
 *
 * Hiçbir koşulda istisna fırlatmaz; gönderim başarısızlığı çağıran akışı
 * kesmemelidir.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (isTest) {
    sentInTest.push(message);
    return;
  }

  if (!isSmtpConfigured()) {
    // Geliştirme kolaylığı: bağlantıyı log'dan kopyalayıp tarayıcıda açabilirsiniz.
    logger.info('E-posta gönderilmedi (SMTP yapılandırılmamış)', {
      to: message.to,
      subject: message.subject,
      body: message.text,
    });
    return;
  }

  try {
    await deliver(message);
    logger.info('E-posta gönderildi', { to: message.to, subject: message.subject });
  } catch (error) {
    // Gönderim başarısızlığı iş akışını kesmez.
    logger.error('E-posta gönderilemedi', {
      to: message.to,
      subject: message.subject,
      error: error instanceof Error ? error : String(error),
    });
  }
}

/**
 * SMTP taşıyıcısı.
 *
 * Tembel kurulur ve tekrar kullanılır: her e-postada yeni bağlantı açmak hem
 * yavaştır hem de sağlayıcıların bağlantı sınırlarına takılır. Nodemailer
 * havuzu kendisi yönetir.
 *
 * Port 465 örtük TLS'tir (`secure: true`); 587 ve 25 düz başlar ve STARTTLS
 * ile yükseltilir — `secure: false` bunu kapatmaz, yalnızca başlangıcı
 * bildirir. `requireTLS`, şifrelenmemiş teslimatı reddeder: kimlik bilgisi ve
 * şifre sıfırlama bağlantısı açık ağdan geçmemelidir.
 */
let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport !== null) return transport;

  const port = env.SMTP_PORT ?? 587;

  transport = createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 3,
  });

  return transport;
}

/** SMTP üzerinden teslim. */
async function deliver(message: EmailMessage): Promise<void> {
  await getTransport().sendMail({
    from: env.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html === undefined ? {} : { html: message.html }),
  });
}

/** Taşıyıcıyı kapatır. Düzgün kapanışta çağrılır; bekleyen bağlantı kalmasın. */
export function closeMailer(): void {
  transport?.close();
  transport = null;
}

/** Testlerde gönderilen e-postaları okur. */
export function getSentEmails(): readonly EmailMessage[] {
  return sentInTest;
}

/** Testler arasında kaydı temizler. */
export function clearSentEmails(): void {
  sentInTest.length = 0;
}
