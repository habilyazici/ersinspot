import { useSearchParams } from 'react-router-dom';

/**
 * Adres çubuğunda tutulan liste süzgeçleri.
 *
 * Süzgeç durumu bileşen durumunda değil ADRESTE tutulur: bir listeyi
 * paylaşmak, yer imine eklemek ve geri tuşuyla dönmek mümkün olmalıdır.
 *
 * Bu yardımcı ALTI ekranda birebir kopyalanmıştı (yönetimdeki sipariş, talep,
 * ürün, blog ve mesaj listeleri ile vitrindeki ürün listesi). Kopyalar
 * ayrışmıştı ve ayrışma sessiz değildi:
 *
 *   • Vitrindeki kopya sayfa sıfırlamasını KOŞULSUZ uyguluyordu; "2. sayfa"
 *     düğmesi numarayı yazdıktan bir satır sonra siliyor ve müşteri ilk 24
 *     üründen ötesine hiç ulaşamıyordu.
 *   • Mesaj listesindeki kopya geçmişe kayıt ekliyordu; süzgeç değiştiren
 *     personel geri tuşuyla listeden çıkamıyor, süzgeçler arasında geziniyordu.
 *
 * Kural tek yerde olduğunda ikisi de olamaz.
 */

/** Sayfa numarasının adres çubuğundaki adı. */
const PAGE_PARAM = 'sayfa';

export interface ListFilters {
  /** Geçerli sorgu parametreleri; süzgeç değerlerini okumak için. */
  readonly params: URLSearchParams;
  /** 1'den küçük olmayan geçerli sayfa numarası. */
  readonly page: number;
  /** Süzgeci yazar; boş değer süzgeci kaldırır. */
  readonly setFilter: (key: string, value: string | undefined) => void;
  /** Tüm süzgeçleri ve sayfa numarasını kaldırır. */
  readonly clearFilters: () => void;
}

export function useListFilters(): ListFilters {
  const [params, setSearchParams] = useSearchParams();

  /*
    Sayfa numarası DOĞRULANIR.

    `?sayfa=abc` adresinden `Number(...)` `NaN` üretiyor ve bu değer sorguya
    konduğunda sunucu isteği reddediyordu: elle yazılmış ya da bozulmuş bir
    bağlantı, listeyi hata ekranına çeviriyordu. Anlamsız değer ilk sayfaya
    düşer.
  */
  const requested = Number(params.get(PAGE_PARAM) ?? '1');
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  function setFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(params);

    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);

    /*
      Süzgeç değişince ilk sayfaya dönülür: üçüncü sayfada süzgeç
      daraltıldığında boş liste görünürdü.

      Sıfırlama SAYFA DEĞİŞİMİNDE uygulanmaz — aksi halde yazılan numara aynı
      çağrıda siliniyor ve sayfalama hiç çalışmıyordu.
    */
    if (key !== PAGE_PARAM) next.delete(PAGE_PARAM);

    /*
      Süzgeç değişimi geçmişe kayıt EKLEMEZ, mevcut kaydı değiştirir. Aksi
      halde her süzgeç dokunuşu bir geçmiş adımı olur ve geri tuşu kullanıcıyı
      sayfadan çıkarmak yerine süzgeçler arasında gezdirirdi.
    */
    setSearchParams(next, { replace: true });
  }

  function clearFilters(): void {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  return { params, page, setFilter, clearFilters };
}
