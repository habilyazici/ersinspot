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
 * SMTP üzerinden teslim.
 *
 * Şimdilik yer tutucu: gerçek gönderim, dağıtım hedefi belirlendiğinde ilgili
 * sağlayıcının istemcisiyle (Resend, Postmark, SES vb.) doldurulacak. Arayüz
 * sabit kaldığı için çağıran kod değişmeyecek.
 */
async function deliver(message: EmailMessage): Promise<void> {
  void message;
  return Promise.reject(
    new Error('SMTP teslimatı henüz uygulanmadı. Sağlayıcı seçildiğinde eklenecek.'),
  );
}

/** Testlerde gönderilen e-postaları okur. */
export function getSentEmails(): readonly EmailMessage[] {
  return sentInTest;
}

/** Testler arasında kaydı temizler. */
export function clearSentEmails(): void {
  sentInTest.length = 0;
}
