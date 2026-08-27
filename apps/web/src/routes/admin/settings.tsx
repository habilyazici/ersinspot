/**
 * Yönetim — site ayarları.
 *
 * YÖNETİCİ yetkisi ister (personel değil): iletişim bilgisi ve çalışma saatleri
 * sitenin her sayfasında görünür, yanlış bir değer doğrudan müşteriye yansır.
 * Yetki sunucuda `requireAdmin` ile kesilir; menüdeki bağlantı da yalnızca
 * yöneticiye gösterilir.
 *
 * Değerler `valueType` alanına göre uygun girdiyle düzenlenir — saat alanına
 * serbest metin yazılması engellenir.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Cog } from 'lucide-react';
import { ApiError } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextField } from '@/components/ui/form-field.tsx';
import { PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { useAdminSettings, useUpdateSetting } from '@/features/content';

/** Ayar anahtarının ön ekine göre gruplama başlığı. */
const GROUP_LABELS: Readonly<Record<string, string>> = {
  contact: 'İletişim Bilgileri',
  hours: 'Çalışma Saatleri',
  social: 'Sosyal Medya',
};

function groupOf(key: string): string {
  return key.split('.')[0] ?? 'diger';
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading, isError, error, refetch } = useAdminSettings();
  const updateSetting = useUpdateSetting();

  /** Düzenlenen değerler; yalnızca dokunulan anahtarlar burada tutulur. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (isLoading) return <PageSpinner label="Ayarlar yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const groups = [...new Set((settings ?? []).map((setting) => groupOf(setting.key)))];

  function save(key: string): void {
    const value = drafts[key];
    if (value === undefined) return;

    updateSetting.mutate(
      { key, value },
      {
        onSuccess: () => {
          toast.success('Ayar kaydedildi.');
          setDrafts((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
        },
        onError: (failure) => {
          toast.error(failure instanceof ApiError ? failure.message : 'Ayar kaydedilemedi.');
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Site Ayarları"
        description="İletişim bilgileri ve çalışma saatleri. Bu değerler sitenin her sayfasında görünür."
      />

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <Section key={group} title={GROUP_LABELS[group] ?? 'Diğer'} icon={Cog}>
            <ul className="space-y-2">
              {(settings ?? [])
                .filter((setting) => groupOf(setting.key) === group)
                .map((setting) => {
                  const draft = drafts[setting.key];
                  const value = draft ?? setting.value;
                  const isDirty = draft !== undefined && draft !== setting.value;

                  return (
                    <Card as="li" key={setting.key} className="space-y-3">
                      {setting.valueType === 'boolean' ? (
                        <SelectField
                          label={setting.description}
                          hint={setting.key}
                          value={value}
                          onChange={(event) => {
                            setDrafts({ ...drafts, [setting.key]: event.target.value });
                          }}
                        >
                          <option value="true">Açık</option>
                          <option value="false">Kapalı</option>
                        </SelectField>
                      ) : (
                        <TextField
                          label={setting.description}
                          hint={setting.key}
                          // Saat alanı serbest metin kabul etmemeli.
                          type={
                            setting.valueType === 'time'
                              ? 'time'
                              : setting.valueType === 'number'
                                ? 'number'
                                : 'text'
                          }
                          value={value}
                          onChange={(event) => {
                            setDrafts({ ...drafts, [setting.key]: event.target.value });
                          }}
                        />
                      )}

                      {isDirty ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            isLoading={updateSetting.isPending}
                            onClick={() => {
                              save(setting.key);
                            }}
                          >
                            Kaydet
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDrafts((current) => {
                                const next = { ...current };
                                delete next[setting.key];
                                return next;
                              });
                            }}
                          >
                            Geri al
                          </Button>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
            </ul>
          </Section>
        ))}
      </div>
    </>
  );
}
