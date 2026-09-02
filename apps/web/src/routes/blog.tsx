/**
 * Blog listesi.
 *
 * Kategoriye göre süzülebilir. Süzgeç adres çubuğuna yazılır: bir kategoriyi
 * paylaşmak veya yer imine eklemek mümkün olmalı, geri tuşu da beklendiği gibi
 * çalışmalıdır. Süzgeci yalnızca bileşen durumunda tutmak bu üçünü de bozardı.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { Clock, ImageOff, Newspaper } from 'lucide-react';
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from '@ersinspot/shared';
import type { BlogCategory } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Pagination } from '@/components/ui/pagination.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';
import { formatDate } from '@/lib/format.ts';
import { useBlogPosts, useBlogTags } from '@/features/content';

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('kategori') ?? undefined;
  const tag = searchParams.get('etiket') ?? undefined;
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useBlogPosts({
    page,
    ...(category === undefined ? {} : { category: category as BlogCategory }),
    ...(tag === undefined ? {} : { tag }),
  });

  const { data: tags } = useBlogTags();

  /**
   * Süzgeci adres çubuğuna yazar.
   *
   * Aynı değere tekrar basmak süzgeci kaldırır; ayrı bir "temizle" düğmesi
   * gerekmez. Kategori ve etiket birbirini dışlar: ikisi birden seçilirse
   * sonuç genellikle boş olur ve kullanıcı sebebini anlamaz.
   */
  function setFilter(key: 'kategori' | 'etiket', value: string | null): void {
    const current = key === 'kategori' ? category : tag;
    // Süzgeç değişince ilk sayfaya dönülür; ikinci sayfada boş liste kalmasın.
    setSearchParams(value === null || value === current ? {} : { [key]: value });
  }

  function goToPage(next: number): void {
    const params = new URLSearchParams(searchParams);
    params.set('sayfa', String(next));
    setSearchParams(params);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Blog"
        description="İkinci el eşya seçimi, bakım ipuçları ve taşınma rehberleri."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setFilter('kategori', null);
          }}
          aria-pressed={category === undefined && tag === undefined}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            category === undefined && tag === undefined
              ? 'border-brand-orange-500 bg-brand-orange-50 text-brand-orange-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300',
          )}
        >
          Tümü
        </button>

        {BLOG_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setFilter('kategori', item);
            }}
            aria-pressed={category === item}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              category === item
                ? 'border-brand-orange-500 bg-brand-orange-50 text-brand-orange-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300',
            )}
          >
            {BLOG_CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      {tags === undefined || tags.length === 0 ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Etiketler
          </span>

          {tags.map((item) => (
            <button
              key={item.slug}
              type="button"
              aria-pressed={tag === item.name}
              onClick={() => {
                setFilter('etiket', item.name);
              }}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs transition-colors',
                tag === item.name
                  ? 'bg-brand-navy-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {item.name}
              <span className="ml-1 tabular-nums opacity-60">{item.postCount}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <PageSpinner label="Yazılar yükleniyor" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Bu kategoride yazı yok"
          description="Diğer kategorilere göz atabilir veya daha sonra tekrar uğrayabilirsiniz."
          className="mt-4"
        />
      ) : (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {data.items.map((post) => (
              <Card as="li" key={post.id} interactive className="p-0">
                <Link to={`/blog/${post.slug}`} className="flex h-full flex-col">
                  <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-slate-100">
                    {post.coverImageUrl === null ? (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="size-8 text-slate-300" aria-hidden="true" />
                      </div>
                    ) : (
                      <img
                        src={post.coverImageUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-orange-600">
                      {BLOG_CATEGORY_LABELS[post.category]}
                    </p>

                    <h2 className="font-semibold text-slate-900">{post.title}</h2>

                    <p className="line-clamp-3 flex-1 text-sm text-slate-600">{post.excerpt}</p>

                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      {post.publishedAt === null ? null : (
                        <span>{formatDate(post.publishedAt)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" aria-hidden="true" />
                        {post.readingMinutes} dk okuma
                      </span>
                    </p>
                  </div>
                </Link>
              </Card>
            ))}
          </ul>

          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      )}
    </PageContainer>
  );
}
