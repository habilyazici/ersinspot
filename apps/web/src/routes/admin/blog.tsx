/**
 * Yönetim — blog yazıları.
 *
 * Liste ve düzenleme aynı sayfadadır: yazı sayısı azdır ve personel genellikle
 * yazdıklarını gözden geçirip küçük düzeltmeler yapar. Ayrı bir düzenleme
 * ekranı fazladan gezinme olurdu.
 *
 * İçerik Markdown yazılır ve YAZARKEN ÖNİZLENİR. Önizleme, vitrinde kullanılan
 * `Markdown` bileşeninin ta kendisidir; ayrı bir önizleme yazılsaydı gerçek
 * çıktıyla ayrışabilirdi.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
// Bağlantı adı, sunucunun kullandığı AYNI fonksiyonla üretilir; ekranda
// önerilen ile kaydedilen ayrışmaz.
import { ApiError, BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, slugify } from '@ersinspot/shared';
import type { BlogCategory } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { Markdown } from '@/components/ui/markdown.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate } from '@/lib/format.ts';
import {
  useAdminBlogPosts,
  useBlogPost,
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
} from '@/features/content';

interface FormState {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string;
  isPublished: boolean;
}

const EMPTY: FormState = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: 'buying_guide',
  tags: '',
  isPublished: false,
};

export default function AdminBlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = (searchParams.get('kategori') ?? undefined) as BlogCategory | undefined;
  const search = searchParams.get('ara') ?? '';
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useAdminBlogPosts({
    page,
    ...(category === undefined ? {} : { category }),
    ...(search === '' ? {} : { search }),
  });

  function setFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);

    // Süzgeç değişince ilk sayfaya dönülür; ikinci sayfada boş liste kalmasın.
    if (key !== 'sayfa') next.delete('sayfa');
    setSearchParams(next);
  }

  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string>('');
  const [isFormOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPreview, setShowPreview] = useState(false);

  /*
    Düzenlemede yazının TAM içeriği gerekir; liste yalnızca özet döndürür.
    Bu yüzden seçilen yazı bağlantı adıyla ayrıca çekilir.
  */
  const editingPost = useBlogPost(editingSlug);

  function startCreate(): void {
    setEditingId(null);
    setEditingSlug('');
    setLoadedSlug(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function startEdit(postId: string, slug: string): void {
    setEditingId(postId);
    setEditingSlug(slug);
    setFormOpen(true);
  }

  /*
    Yazı yüklendiğinde formu doldur.

    Doldurma RENDER SIRASINDA, hangi yazının yüklendiği karşılaştırılarak
    yapılır — React'in "prop değişince state'i ayarla" için önerdiği kalıp.
    `useEffect` içinde `setState` çağırmak zincirleme render üretir: React
    önce eski formla boyar, sonra effect state'i değiştirir ve ikinci kez
    boyar. Kullanıcı bir an boş formu görür.

    `loadedSlug` hangi yazının forma yazıldığını tutar; aynı yazı ikinci kez
    doldurulmaz, yoksa kullanıcının yazdıkları her render'da geri alınırdı.
  */
  const loadedPost = editingPost.data;
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  if (loadedPost !== undefined && loadedPost.slug !== loadedSlug) {
    setLoadedSlug(loadedPost.slug);
    setForm({
      slug: loadedPost.slug,
      title: loadedPost.title,
      excerpt: loadedPost.excerpt,
      content: loadedPost.content,
      category: loadedPost.category,
      tags: loadedPost.tags.join(', '),
      isPublished: loadedPost.isPublished,
    });
  }

  function reportError(failure: unknown, fallback: string): void {
    toast.error(failure instanceof ApiError ? failure.message : fallback);
  }

  function submit(): void {
    const payload = {
      slug: form.slug === '' ? slugify(form.title) : form.slug,
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      category: form.category,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      isPublished: form.isPublished,
      coverImageStorageKey: null,
    };

    const done = {
      onSuccess: () => {
        toast.success(editingId === null ? 'Yazı oluşturuldu.' : 'Yazı güncellendi.');
        setFormOpen(false);
        setForm(EMPTY);
        setEditingId(null);
        setEditingSlug('');
      },
      onError: (failure: unknown) => {
        reportError(failure, 'Yazı kaydedilemedi.');
      },
    };

    if (editingId === null) createPost.mutate(payload, done);
    else updatePost.mutate({ postId: editingId, post: payload }, done);
  }

  if (isLoading) return <PageSpinner label="Yazılar yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Blog"
        description="Vitrindeki blog yazıları. Taslaklar yalnızca burada görünür."
        aside={
          <Button size="sm" onClick={startCreate}>
            <Plus aria-hidden="true" />
            Yazı ekle
          </Button>
        }
      />

      {isFormOpen ? (
        <Card padding="md" className="mt-6 space-y-4">
          <h2 className="font-semibold text-slate-900">
            {editingId === null ? 'Yeni Yazı' : 'Yazıyı Düzenle'}
          </h2>

          {editingId !== null && editingPost.isLoading ? (
            <PageSpinner label="Yazı yükleniyor" />
          ) : (
            <>
              <TextField
                label="Başlık"
                required
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value });
                }}
              />

              <TextField
                label="Bağlantı adı"
                hint="Boş bırakılırsa başlıktan üretilir. Yayınlandıktan sonra değiştirmek eski bağlantıları kırar."
                placeholder={slugify(form.title)}
                value={form.slug}
                onChange={(event) => {
                  setForm({ ...form, slug: event.target.value });
                }}
              />

              <TextAreaField
                label="Özet"
                required
                rows={3}
                hint="Liste kartlarında ve arama sonuçlarında görünür."
                value={form.excerpt}
                onChange={(event) => {
                  setForm({ ...form, excerpt: event.target.value });
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Kategori"
                  required
                  value={form.category}
                  onChange={(event) => {
                    setForm({ ...form, category: event.target.value as BlogCategory });
                  }}
                >
                  {BLOG_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {BLOG_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Etiketler"
                  hint="Virgülle ayırın: Buzdolabı, Bakım"
                  value={form.tags}
                  onChange={(event) => {
                    setForm({ ...form, tags: event.target.value });
                  }}
                />
              </div>

              <TextAreaField
                label="İçerik (Markdown)"
                required
                rows={14}
                hint="## başlık, - madde, **kalın**, [metin](/adres) desteklenir."
                value={form.content}
                onChange={(event) => {
                  setForm({ ...form, content: event.target.value });
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPreview(!showPreview);
                  }}
                >
                  {showPreview ? 'Önizlemeyi kapat' : 'Önizle'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({ ...form, isPublished: !form.isPublished });
                  }}
                >
                  {form.isPublished ? (
                    <>
                      <Eye aria-hidden="true" />
                      Yayında
                    </>
                  ) : (
                    <>
                      <EyeOff aria-hidden="true" />
                      Taslak
                    </>
                  )}
                </Button>
              </div>

              {showPreview ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {/* Vitrinde kullanılan bileşenin ta kendisi. */}
                  <Markdown content={form.content} />
                </div>
              ) : null}

              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <Button
                  disabled={form.title.trim().length < 5 || form.content.trim().length < 100}
                  isLoading={createPost.isPending || updatePost.isPending}
                  onClick={submit}
                >
                  Kaydet
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setEditingSlug('');
                    setForm(EMPTY);
                  }}
                >
                  Vazgeç
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        <TextField
          label="Ara"
          type="search"
          placeholder="Başlık, özet veya bağlantı adı"
          defaultValue={search}
          onChange={(event) => {
            setFilter('ara', event.target.value);
          }}
        />

        <FilterChips
          label="Kategori"
          value={category}
          onChange={(next) => {
            setFilter('kategori', next);
          }}
          options={BLOG_CATEGORIES.map((value) => ({
            value,
            label: BLOG_CATEGORY_LABELS[value],
          }))}
        />
      </div>

      {data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={search === '' && category === undefined ? 'Henüz yazı yok' : 'Sonuç bulunamadı'}
          description={
            search === '' && category === undefined
              ? 'İlk yazıyı ekleyerek başlayın.'
              : 'Süzgeçleri değiştirerek tekrar deneyin.'
          }
          className="mt-8"
        />
      ) : (
        <>
          <ul className="mt-8 space-y-2">
            {data.items.map((post) => (
              <Card as="li" key={post.id} className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{post.title}</p>

                  <p className="mt-1 text-xs text-slate-500">
                    {BLOG_CATEGORY_LABELS[post.category]}
                    {post.publishedAt === null ? '' : ` · ${formatDate(post.publishedAt)}`} ·{' '}
                    {post.readingMinutes} dk
                  </p>
                </div>

                {/*
                Taslak/yayında ayrımı listede görünmeli: yayın tarihinin
                yokluğundan çıkarmak, personelin her satırda tahmin yürütmesi
                demekti.
              */}
                <StatusBadge
                  meta={
                    post.publishedAt === null
                      ? { label: 'Taslak', description: 'Yayınlanmadı', tone: 'neutral' }
                      : { label: 'Yayında', description: 'Vitrinde görünür', tone: 'success' }
                  }
                />

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Düzenle"
                    onClick={() => {
                      startEdit(post.id, post.slug);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sil"
                    className="text-state-danger-fg"
                    isLoading={deletePost.isPending}
                    onClick={() => {
                      deletePost.mutate(post.id, {
                        onSuccess: () => {
                          toast.success('Yazı silindi.');
                        },
                        onError: (failure) => {
                          reportError(failure, 'Yazı silinemedi.');
                        },
                      });
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) => {
              setFilter('sayfa', String(next));
            }}
          />
        </>
      )}
    </>
  );
}
