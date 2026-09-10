/**
 * Blog listesi.
 *
 * Kategoriye göre süzülebilir. Süzgeç adres çubuğuna yazılır: bir kategoriyi
 * paylaşmak veya yer imine eklemek mümkün olmalı, geri tuşu da beklendiği gibi
 * çalışmalıdır. Süzgeci yalnızca bileşen durumunda tutmak bu üçünü de bozardı.
 */

import { Link } from 'react-router-dom';
import { Clock, ImageOff, Newspaper } from 'lucide-react';
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';
import { formatDate } from '@/lib/format.ts';
import { enumParam, useListFilters } from '@/lib/list-filters.ts';
import { useBlogPosts, useBlogTags } from '@/features/content';

export default function BlogPage() {
  const { params, page, hasActiveFilters, setFilters } = useListFilters();
  const category = enumParam(params.get('kategori'), BLOG_CATEGORIES);
  const tag = params.get('etiket') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useBlogPosts({
    page,
    ...(category === undefined ? {} : { category }),
    ...(tag === undefined ? {} : { tag }),
  });

  const { data: tags } = useBlogTags();

  /**
   * Süzgeci adres çubuğuna yazar.
   *
   * Aynı değere tekrar basmak süzgeci kaldırır; ayrı bir "temizle" düğmesi
   * gerekmez. Kategori ve etiket BİRBİRİNİ DIŞLAR: ikisi birden seçilirse
   * sonuç genellikle boş olur ve kullanıcı sebebini anlamaz. Bu yüzden ikisi
   * tek yazımda değiştirilir; ardışık iki `setFilter` çağrısı ikincisinin
   * birincisini silmesiyle sonuçlanırdı.
   */
  function setFilter(key: 'kategori' | 'etiket', value: string | undefined): void {
    const current = key === 'kategori' ? category : tag;
    const next = value === undefined || value === current ? undefined : value;

    setFilters({ kategori: undefined, etiket: undefined, [key]: next });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Blog"
        description="İkinci el eşya seçimi, bakım ipuçları ve taşınma rehberleri."
      />

      <FilterChips
        label="Yazı kategorisi"
        className="mt-6"
        options={BLOG_CATEGORIES.map((item) => ({
          value: item,
          label: BLOG_CATEGORY_LABELS[item],
        }))}
        value={category}
        onChange={(value) => {
          setFilter('kategori', value);
        }}
      />

      {tags === undefined || tags.length === 0 ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
          title={hasActiveFilters ? 'Bu filtreyle yazı yok' : 'Henüz yazı yok'}
          description={
            hasActiveFilters
              ? 'Diğer kategorilere göz atabilir veya etiketi kaldırabilirsiniz.'
              : 'Yakında burada olacağız.'
          }
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
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-orange-700">
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

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) => {
              setFilters({ sayfa: String(next) });
            }}
          />
        </>
      )}
    </PageContainer>
  );
}
