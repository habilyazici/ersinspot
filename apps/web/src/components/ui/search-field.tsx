import { useEffect, useRef, useState } from 'react';
import { TextField } from './form-field.tsx';

/**
 * Liste ekranlarının arama kutusu.
 *
 * İki sorunu birden çözer; ikisi de beş ayrı listede aynı şekilde vardı
 * (vitrin ürünleri, yönetimdeki ürün, sipariş, talep ve blog listeleri).
 *
 * 1. GECİKTİRME. Kutu her tuş vuruşunda süzgeci güncelliyordu: "buzdolabı"
 *    yazmak dokuz ağ isteği demekti ve yazım sürerken sonuçlar altta sürekli
 *    değişiyordu. Değer yazma durduktan sonra bir kez yukarı bildirilir.
 *
 * 2. GEÇMİŞ KİRLİLİĞİ. Süzgeç adres çubuğuna yazılıyor ve her tuş vuruşu
 *    tarayıcı geçmişine bir kayıt bırakıyordu; kullanıcı geri tuşuna
 *    bastığında sayfadan çıkmak yerine harf harf geriye gidiyordu. Süzgeç
 *    güncellemesi artık geçmişe eklemek yerine mevcut kaydı DEĞİŞTİRİR
 *    (`setSearchParams(..., { replace: true })` çağıran tarafta).
 *
 * Kutu kendi metnini tutar (denetimli), böylece yazarken imleç kaymaz;
 * dışarıdan gelen değer değiştiğinde (süzgeç temizlendi, bağlantı paylaşıldı)
 * kendini ona eşitler.
 */

/** Yazma durduktan sonra beklenen süre. */
const DEBOUNCE_MS = 300;

export interface SearchFieldProps {
  label?: string;
  placeholder?: string;
  /** Adres çubuğundaki güncel değer. */
  value: string;
  /** Yazma durduğunda çağrılır. */
  onSearch: (value: string) => void;
  className?: string;
}

export function SearchField({
  label = 'Ara',
  placeholder,
  value,
  onSearch,
  className,
}: SearchFieldProps) {
  const [text, setText] = useState(value);

  /*
    Dışarıdan gelen değere eşitlenme çizim SIRASINDA yapılır, effect'le değil.

    Effect ile yapılsaydı kullanıcı önce eski metni görür, hemen ardından
    ikinci bir çizimle yenisi gelirdi. React'in belgelediği yol, en son
    görülen dış değeri durumda tutup değiştiğinde ayarlamaktır.
  */
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Bileşen sökülürken bekleyen zamanlayıcı kalmasın: sökülmüş bileşenin
  // geri çağrısı yönlendirme yapıyor olabilir.
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <TextField
      label={label}
      type="search"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          onSearch(next);
        }, DEBOUNCE_MS);
      }}
      className={className}
    />
  );
}
