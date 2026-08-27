/**
 * Blog yazısı.
 *
 * İçerik Markdown olarak saklanır ve `Markdown` bileşeniyle REACT ELEMANLARINA
 * çevrilir — HTML dizesine değil. Yazılar yönetim panelinden girildiği için
 * içerik kaynağı güvenilir sayılabilir; yine de ham HTML basmamak, tek bir
 * hatalı girdinin siteyi ele geçirmesini yapısal olarak imkânsız kılar.
 */

import { Link, useParams } from 'react-router-dom';
import { Clock, ImageOff, User } from 'lucide-react';
import { BLOG_CATEGORY_LABELS } from '@ersinspot/shared';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { Markdown } from '@/components/ui/markdown.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { formatDate } from '@/lib/format.ts';
import { useBlogPost } from '@/features/content';

export default function BlogDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError, error, refetch } = useBlogPost(slug);

  if (isLoading) return <PageSpinner label="Yazı yükleniyor" />;

  if (isError || post === undefined) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="prose">
      <PageHeader
        backTo={{ to: '/blog', label: 'Blog' }}
        title={post.title}
        meta={
          <>
            <span className="font-medium text-brand-orange-600">
              {BLOG_CATEGORY_LABELS[post.category]}
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <User className="size-3.5" aria-hidden="true" />
              {post.authorName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {post.readingMinutes} dk okuma
            </span>
            {post.publishedAt === null ? null : (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatDate(post.publishedAt)}</span>
              </>
            )}
          </>
        }
      />

      <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
        {post.coverImageUrl === null ? (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="size-10 text-slate-300" aria-hidden="true" />
          </div>
        ) : (
          <img src={post.coverImageUrl} alt="" className="size-full object-cover" />
        )}
      </div>

      <p className="mt-6 border-l-4 border-brand-orange-200 pl-4 text-base italic text-slate-600">
        {post.excerpt}
      </p>

      <article className="mt-2">
        <Markdown content={post.content} />
      </article>

      {post.tags.length === 0 ? null : (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold text-slate-900">Etiketler</h2>

          <ul className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <Link to="/blog" className="text-sm font-medium text-brand-navy-700 hover:underline">
          Diğer yazılara göz atın
        </Link>
      </div>
    </PageContainer>
  );
}
