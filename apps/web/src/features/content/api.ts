/**
 * İçerik sorguları: blog, SSS, site ayarları, iletişim.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  BlogListQuery,
  BlogPost,
  BlogPostSummary,
  CreateContactMessageInput,
  Faq,
  Paginated,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export const contentKeys = {
  settings: ['content', 'settings'] as const,
  blog: (filters: Partial<BlogListQuery>) => ['content', 'blog', filters] as const,
  post: (slug: string) => ['content', 'post', slug] as const,
  faqs: ['content', 'faqs'] as const,
};

/**
 * Site ayarları.
 *
 * İletişim bilgileri ve çalışma saatleri gibi, arayüzün her yerinde kullanılan
 * değerler. Nadiren değiştiği için uzun süre önbellekte tutulur.
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
