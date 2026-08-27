/**
 * Sıkça sorulan sorular.
 *
 * Sorular kategoriye göre gruplanır ve açılır-kapanır olarak gösterilir.
 * Bunun için `<details>`/`<summary>` kullanılır: açılıp kapanma tarayıcının
 * kendi davranışıdır, klavye ve ekran okuyucu desteği hazır gelir ve JavaScript
 * yüklenmeden de çalışır. Elle yazılmış bir akordeon bu üçünü de yeniden
 * üretmek zorunda kalırdı.
 */

import { HelpCircle } from 'lucide-react';
import { FAQ_CATEGORY_LABELS, FAQ_CATEGORIES } from '@ersinspot/shared';
import type { Faq, FaqCategory } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { useFaqs } from '@/features/content';

/** Soruları kategoriye göre gruplar; kategori sırası sabittir. */
function groupByCategory(faqs: readonly Faq[]): { category: FaqCategory; items: Faq[] }[] {
  return FAQ_CATEGORIES.map((category) => ({
    category,
    items: faqs.filter((faq) => faq.category === category),
  })).filter((group) => group.items.length > 0);
}

export default function FaqPage() {
  const { data: faqs, isLoading, isError, error, refetch } = useFaqs();

  if (isLoading) return <PageSpinner label="Sorular yükleniyor" />;

  if (isError) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const groups = groupByCategory(faqs ?? []);

  return (
    <PageContainer width="prose">
      <PageHeader
        title="Sıkça Sorulan Sorular"
        description="Merak ettiklerinizin çoğunun cevabı burada. Bulamazsanız bize yazın, yardımcı olalım."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Henüz soru eklenmemiş"
          description="Aklınıza takılan bir şey varsa iletişim formundan bize ulaşabilirsiniz."
          className="mt-8"
        />
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <Section key={group.category} title={FAQ_CATEGORY_LABELS[group.category]}>
              <ul className="space-y-2">
                {group.items.map((faq) => (
                  <Card as="li" key={faq.id} className="p-0">
                    <details className="group">
                      <summary className="cursor-pointer list-none p-4 text-sm font-medium text-slate-900 marker:content-none">
                        <span className="flex items-start justify-between gap-3">
                          {faq.question}
                          {/*
                            Ok işareti `details` açıkken döner. Durum bilgisini
                            tarayıcı taşır; ayrıca bir React durumu tutulmaz.
                          */}
                          <span
                            className="mt-1 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </span>
                      </summary>

                      <p className="whitespace-pre-line border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {faq.answer}
                      </p>
                    </details>
                  </Card>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
