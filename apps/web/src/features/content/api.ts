/**
 * İçerik sorguları: blog, SSS, site ayarları, iletişim.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BlogListQuery,
  ContactMessage,
  ContactMessageListQuery,
  CreateBlogPostInput,
  CreateFaqInput,
  ReplyToContactMessageInput,
  UpdateBlogPostInput,
  BlogPost,
  BlogPostSummary,
  CreateContactMessageInput,
  Faq,
  Paginated,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export const contentKeys = {
  all: ['content'] as const,
  settings: ['content', 'settings'] as const,
  paymentSettings: ['content', 'settings', 'payment'] as const,
  adminBlog: (filters: Partial<BlogListQuery>) => ['content', 'admin', 'blog', filters] as const,
  adminFaqs: ['content', 'admin', 'faqs'] as const,
  adminSettings: ['content', 'admin', 'settings'] as const,
  messages: (filters: Partial<ContactMessageListQuery>) =>
    ['content', 'admin', 'messages', filters] as const,
  unreadCount: ['content', 'admin', 'messages', 'unread'] as const,
  blog: (filters: Partial<BlogListQuery>) => ['content', 'blog', filters] as const,
  post: (slug: string) => ['content', 'post', slug] as const,
  faqs: ['content', 'faqs'] as const,
  blogTags: ['content', 'blog', 'tags'] as const,
};

/**
 * Vitrin ayarları.
 *
 * İletişim bilgileri, çalışma saatleri ve duyuru: arayüzün her yerinde
 * kullanılan, herkese açık değerler. Nadiren değiştiği için uzun süre
 * önbellekte tutulur.
 *
 * Havale bilgileri BURADA DÖNMEZ; onlar oturum ister (`usePaymentSettings`).
 */
export function useSiteSettings() {
  return useQuery({
    queryKey: contentKeys.settings,
    queryFn: async () => {
      const response = await apiRequest<{ settings: Record<string, string> }>('/api/settings');
      return response.settings;
    },
    staleTime: 30 * 60_000,
  });
}

/**
 * Ödeme bilgileri — oturum gerektirir.
 *
 * Havale/EFT ile ödeyecek müşterinin banka bilgilerine ihtiyacı vardır. Bunlar
 * vitrin ayarlarından ayrı bir uçtan gelir: IBAN ile hesap sahibinin adı
 * birlikte kimlik avı için hazır bir şablondur ve oturumsuz ziyaretçiye
 * gönderilmez.
 *
 * Yanıt vitrin değerlerini de içerir; çağıran tek bir harita okur.
 */
export function usePaymentSettings() {
  return useQuery({
    queryKey: contentKeys.paymentSettings,
    queryFn: async () => {
      const response = await apiRequest<{ settings: Record<string, string> }>(
        '/api/settings/payment',
      );
      return response.settings;
    },
    staleTime: 30 * 60_000,
  });
}

export function useBlogPosts(filters: Partial<BlogListQuery> = {}) {
  return useQuery({
    queryKey: contentKeys.blog(filters),
    queryFn: () =>
      apiRequest<Paginated<BlogPostSummary>>('/api/blog', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          category: filters.category,
          tag: filters.tag,
          search: filters.search,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: contentKeys.post(slug),
    queryFn: async () => {
      const response = await apiRequest<{ post: BlogPost }>(`/api/blog/${slug}`);
      return response.post;
    },
    enabled: slug !== '',
  });
}

export function useFaqs() {
  return useQuery({
    queryKey: contentKeys.faqs,
    queryFn: async () => {
      const response = await apiRequest<{ faqs: Faq[] }>('/api/faqs');
      return response.faqs;
    },
    staleTime: 10 * 60_000,
  });
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: CreateContactMessageInput) =>
      apiRequest<{ success: boolean }>('/api/contact', { method: 'POST', body: input }),
  });
}

/**
 * Kullanılan blog etiketleri, yazı sayısıyla birlikte.
 *
 * Yalnızca en az bir yayınlanmış yazıya bağlı etiketler döner; boş bir etikete
 * tıklamak kullanıcıyı boş bir listeye götürürdü.
 */
export function useBlogTags() {
  return useQuery({
    queryKey: contentKeys.blogTags,
    queryFn: async () => {
      const response = await apiRequest<{
        tags: { name: string; slug: string; postCount: number }[];
      }>('/api/blog/tags');
      return response.tags;
    },
    staleTime: 10 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Yönetim — blog
// ---------------------------------------------------------------------------

/**
 * Taslaklar dahil tüm yazılar. Vitrin listesi yalnızca yayınlananları döner.
 *
 * Süzgeç ve sayfa parametreleri vitrindekiyle aynıdır. Önceden hiç
 * gönderilmiyordu: liste ilk sayfada donuyor ve yazı sayısı sayfa boyutunu
 * geçtiğinde kalanlar sessizce görünmez oluyordu.
 */
export function useAdminBlogPosts(filters: Partial<BlogListQuery> = {}) {
  return useQuery({
    queryKey: contentKeys.adminBlog(filters),
    queryFn: () =>
      apiRequest<Paginated<BlogPostSummary>>('/api/admin/blog', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          category: filters.category,
          search: filters.search,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlogPostInput) => {
      const response = await apiRequest<{ post: { postId: string } }>('/api/admin/blog', {
        method: 'POST',
        body: input,
      });
      return response.post;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string; post: UpdateBlogPostInput }) =>
      apiRequest<{ success: boolean }>(`/api/admin/blog/${input.postId}`, {
        method: 'PUT',
        body: input.post,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiRequest<{ success: boolean }>(`/api/admin/blog/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Yönetim — SSS
// ---------------------------------------------------------------------------

/** Yayından kaldırılmış sorular dahil. */
export function useAdminFaqs() {
  return useQuery({
    queryKey: contentKeys.adminFaqs,
    queryFn: async () => {
      const response = await apiRequest<{ faqs: Faq[] }>('/api/admin/faqs');
      return response.faqs;
    },
  });
}

export function useCreateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFaqInput) =>
      apiRequest<{ faq: { faqId: string } }>('/api/admin/faqs', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useUpdateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { faqId: string; faq: Partial<CreateFaqInput> }) =>
      apiRequest<{ success: boolean }>(`/api/admin/faqs/${input.faqId}`, {
        method: 'PUT',
        body: input.faq,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (faqId: string) =>
      apiRequest<{ success: boolean }>(`/api/admin/faqs/${faqId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Yönetim — iletişim mesajları
// ---------------------------------------------------------------------------

export function useContactMessages(filters: Partial<ContactMessageListQuery> = {}) {
  return useQuery({
    queryKey: contentKeys.messages(filters),
    queryFn: () =>
      apiRequest<Paginated<ContactMessage>>('/api/admin/contact-messages', {
        query: { page: filters.page, pageSize: filters.pageSize, subject: filters.subject },
      }),
    placeholderData: (previous) => previous,
  });
}

/** Okunmamış mesaj sayısı. Yönetim menüsündeki rozet için. */
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: contentKeys.unreadCount,
    queryFn: async () => {
      const response = await apiRequest<{ count: number }>(
        '/api/admin/contact-messages/unread-count',
      );
      return response.count;
    },
    // Personel panelde dururken yeni mesaj gelebilir.
    refetchInterval: 60_000,
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest<{ success: boolean }>(`/api/admin/contact-messages/${messageId}/read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

/** Mesaja yanıt verir; yanıt müşteriye e-posta ile gider. */
export function useReplyToMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { messageId: string; reply: ReplyToContactMessageInput }) =>
      apiRequest<{ success: boolean }>(`/api/admin/contact-messages/${input.messageId}/reply`, {
        method: 'POST',
        body: input.reply,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Yönetim — site ayarları
// ---------------------------------------------------------------------------

/** Ayarların tam listesi: değer, tür ve açıklamasıyla. Yönetici yetkisi ister. */
export function useAdminSettings() {
  return useQuery({
    queryKey: contentKeys.adminSettings,
    queryFn: async () => {
      const response = await apiRequest<{
        settings: { key: string; value: string; valueType: string; description: string }[];
      }>('/api/admin/settings');
      return response.settings;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { key: string; value: string }) =>
      apiRequest<{ success: boolean }>(`/api/admin/settings/${input.key}`, {
        method: 'PUT',
        body: { value: input.value },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}
