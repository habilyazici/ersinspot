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

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError, BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from '@ersinspot/shared';
import type { BlogCategory } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { Markdown } from '@/components/ui/markdown.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
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

/** Başlıktan bağlantı adı üretir. Personel isterse elle değiştirebilir. */
function slugify(title: string): string {
  return title
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export default function AdminBlogPage() {
  const { data, isLoading, isError, error, refetch } = useAdminBlogPosts();

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

    `useEffect` kullanılır; render sırasında `setState` çağırmak React'te
    yeniden render döngüsü tetikler ve kuralca yasaktır. Bağımlılık yalnızca
    yüklenen yazıdır: form her tuşta yeniden doldurulmamalıdır.
  */
  const loadedPost = editingPost.data;

  useEffect(() => {
    if (loadedPost === undefined) return;

    setForm({
      slug: loadedPost.slug,
      title: loadedPost.title,
      excerpt: loadedPost.excerpt,
      content: loadedPost.content,
      category: loadedPost.category,
      tags: loadedPost.tags.join(', '),
      isPublished: loadedPost.isPublished,
    });
  }, [loadedPost]);

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

      {data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Henüz yazı yok"
          description="İlk yazıyı ekleyerek başlayın."
          className="mt-8"
        />
      ) : (
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
      )}
    </>
  );
}
