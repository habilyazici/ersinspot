/**
 * Yönetim — sıkça sorulan sorular.
 *
 * Ekleme ve düzenleme AYNI formda yapılır: iki ayrı ekran, aynı alanların iki
 * kez yazılması ve zamanla ayrışması demek olurdu. Düzenlemeye basıldığında
 * form mevcut değerlerle dolar.
 *
 * Yayından kaldırma silmeden ayrıdır: geçici olarak gizlenen bir sorunun metni
 * kaybolmamalıdır.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, HelpCircle, Pencil, Plus } from 'lucide-react';
import { ApiError, FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from '@ersinspot/shared';
import type { Faq, FaqCategory } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { ConfirmDelete } from '@/components/ui/confirm-delete.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { useAdminFaqs, useCreateFaq, useDeleteFaq, useUpdateFaq } from '@/features/content';

interface FormState {
  question: string;
  answer: string;
  category: FaqCategory;
  displayOrder: number;
}

const EMPTY: FormState = { question: '', answer: '', category: 'orders', displayOrder: 0 };

export default function AdminFaqsPage() {
  const { data: faqs, isLoading, isError, error, refetch } = useAdminFaqs();

  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  /** Düzenlenen kaydın kimliği; `null` ise form yeni kayıt içindir. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function startCreate(): void {
    setEditingId(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function startEdit(faq: Faq): void {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      displayOrder: faq.displayOrder,
    });
    setFormOpen(true);
  }

  function reportError(failure: unknown, fallback: string): void {
    toast.error(failure instanceof ApiError ? failure.message : fallback);
  }

  function submit(): void {
    const done = {
      onSuccess: () => {
        toast.success(editingId === null ? 'Soru eklendi.' : 'Soru güncellendi.');
        setFormOpen(false);
        setForm(EMPTY);
        setEditingId(null);
      },
      onError: (failure: unknown) => {
        reportError(failure, 'Kaydedilemedi.');
      },
    };

    if (editingId === null) createFaq.mutate({ ...form, isPublished: true }, done);
    else updateFaq.mutate({ faqId: editingId, faq: form }, done);
  }

  if (isLoading) return <PageSpinner label="Sorular yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const grouped = FAQ_CATEGORIES.map((category) => ({
    category,
    items: (faqs ?? []).filter((faq) => faq.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title="Sıkça Sorulan Sorular"
        description="Vitrindeki SSS sayfasının içeriği. Yayından kaldırılan sorular saklanır, silinmez."
        aside={
          <Button size="sm" onClick={startCreate}>
            <Plus aria-hidden="true" />
            Soru ekle
          </Button>
        }
      />

      {isFormOpen ? (
        <Card padding="md" className="mt-6 space-y-4">
          <h2 className="font-semibold text-slate-900">
            {editingId === null ? 'Yeni Soru' : 'Soruyu Düzenle'}
          </h2>

          <TextField
            label="Soru"
            required
            value={form.question}
            onChange={(event) => {
              setForm({ ...form, question: event.target.value });
            }}
          />

          <TextAreaField
            label="Cevap"
            required
            rows={5}
            value={form.answer}
            onChange={(event) => {
              setForm({ ...form, answer: event.target.value });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Kategori"
              required
              value={form.category}
              onChange={(event) => {
                setForm({ ...form, category: event.target.value as FaqCategory });
              }}
            >
              {FAQ_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {FAQ_CATEGORY_LABELS[category]}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Sıra"
              type="number"
              min={0}
              hint="Küçük sayı önce görünür."
              value={String(form.displayOrder)}
              onChange={(event) => {
                setForm({ ...form, displayOrder: Number(event.target.value) });
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              disabled={form.question.trim().length < 5 || form.answer.trim().length < 10}
              isLoading={createFaq.isPending || updateFaq.isPending}
              onClick={submit}
            >
              Kaydet
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
            >
              Vazgeç
            </Button>
          </div>
        </Card>
      ) : null}

      {grouped.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Henüz soru yok"
          description="İlk soruyu ekleyerek başlayın."
          className="mt-8"
        />
      ) : (
        <div className="mt-8 space-y-8">
          {grouped.map((group) => (
            <Section key={group.category} title={FAQ_CATEGORY_LABELS[group.category]}>
              <ul className="space-y-2">
                {group.items.map((faq) => (
                  <Card as="li" key={faq.id} className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">
                        {faq.question}
                      </p>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={faq.isPublished ? 'Yayından kaldır' : 'Yayına al'}
                          /*
                            Yükleme göstergesi YALNIZCA işlem gören satırda.
                            Mutasyon durumu liste boyunca paylaşıldığı için tek
                            satıra basmak bütün satırları döndürüyordu.
                          */
                          isLoading={updateFaq.isPending && updateFaq.variables?.faqId === faq.id}
                          onClick={() => {
                            updateFaq.mutate(
                              { faqId: faq.id, faq: { isPublished: !faq.isPublished } },
                              {
                                onSuccess: () => {
                                  toast.success(
                                    faq.isPublished ? 'Yayından kaldırıldı.' : 'Yayına alındı.',
                                  );
                                },
                                onError: (failure) => {
                                  reportError(failure, 'Değiştirilemedi.');
                                },
                              },
                            );
                          }}
                        >
                          {faq.isPublished ? (
                            <Eye aria-hidden="true" />
                          ) : (
                            <EyeOff className="text-slate-400" aria-hidden="true" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Düzenle"
                          onClick={() => {
                            startEdit(faq);
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>

                        <ConfirmDelete
                          label="Soruyu sil"
                          question="Soru kalıcı olarak silinecek."
                          isPending={deleteFaq.isPending && deleteFaq.variables === faq.id}
                          onConfirm={() => {
                            deleteFaq.mutate(faq.id, {
                              onSuccess: () => {
                                toast.success('Soru silindi.');
                              },
                              onError: (failure) => {
                                reportError(failure, 'Silinemedi.');
                              },
                            });
                          }}
                        />
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-sm text-slate-600">{faq.answer}</p>

                    {faq.isPublished ? null : (
                      <p className="text-xs font-medium text-state-pending-fg">
                        Yayında değil — vitrinde görünmüyor.
                      </p>
                    )}
                  </Card>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </>
  );
}
