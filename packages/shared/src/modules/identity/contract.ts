/**
 * Kimlik doğrulama şemaları.
 *
 * Güvenlik notu: bu şemalar yalnızca *biçim* doğrular. Kimlik kanıtlama, hız sınırı
 * ve oturum yönetimi sunucu tarafında yapılır. Tarayıcıda çalışan hiçbir kontrol
 * güvenlik kararı olarak sayılmaz.
 */

import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
  phoneSchema,
} from '../../kernel/validation.ts';
import { USER_ROLES } from '../../kernel/status.ts';

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    /** Kullanım koşullarının kabul edilmesi zorunludur. */
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Devam etmek için kullanım koşullarını kabul etmelisiniz.' }),
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Şifreler eşleşmiyor.',
    path: ['passwordConfirm'],
  })
  // Şifrenin e-posta veya ad içermesi, sızdırılmış veri listelerinde tahmin edilmesini kolaylaştırır.
  .refine(
    (data) => {
      const password = data.password.toLowerCase();
      const emailLocal = data.email.split('@')[0]?.toLowerCase() ?? '';
      return emailLocal.length < 4 || !password.includes(emailLocal);
    },
    { message: 'Şifreniz e-posta adresinizi içeremez.', path: ['password'] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

/**
 * Girişte şifre için `passwordSchema` kullanılmaz. Kurallar zamanla değişebilir;
 * eski kurala göre oluşturulmuş geçerli bir şifre, yeni kural yüzünden
 * reddedilmemelidir. Girişte yalnızca alanın boş olmadığı kontrol edilir.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Şifre zorunludur.' }),
  /** Seçilirse oturum süresi uzatılır. */
  rememberMe: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Şifre sıfırlama
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    /** E-posta bağlantısındaki tek kullanımlık jeton. */
    token: z.string().min(32, { message: 'Geçersiz sıfırlama bağlantısı.' }),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Şifreler eşleşmiyor.',
    path: ['passwordConfirm'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Şifre değiştirme (oturum açıkken)
// ---------------------------------------------------------------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Mevcut şifreniz zorunludur.' }),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Yeni şifreler eşleşmiyor.',
    path: ['newPasswordConfirm'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Yeni şifreniz mevcut şifrenizden farklı olmalıdır.',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// E-posta doğrulama
// ---------------------------------------------------------------------------

export const verifyEmailSchema = z.object({
  token: z.string().min(32, { message: 'Geçersiz doğrulama bağlantısı.' }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---------------------------------------------------------------------------
// Sunucudan dönen kullanıcı görünümü
// ---------------------------------------------------------------------------

/**
 * Oturum sahibinin kendi bilgisi. Şifre hash'i, oturum jetonu gibi alanlar
 * bu görünümde bilinçli olarak yoktur — sunucu bu tipin dışına asla veri sızdırmaz.
 */
export const currentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  phone: z.string(),
  role: z.enum(USER_ROLES),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
