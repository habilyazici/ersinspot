import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button.tsx';

describe('düğme', () => {
  it('tıklanabilir', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kaydet</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('yükleme sırasında devre dışı kalır ve tıklanamaz', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Kaydet
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('yükleme sırasında durum metni gösterir', () => {
    render(<Button isLoading>Kaydet</Button>);

    // Görme engelli kullanıcı için de anlaşılır olmalı: yalnızca dönen simge
    // yeterli değildir.
    expect(screen.getByText('İşleniyor…')).toBeInTheDocument();
  });

  it('simge düğmesinde durum metni ekran okuyucuya kalır', () => {
    // Sabit kare kutuya metin sığmaz; görsel olarak gizlenir ama kaldırılmaz.
    render(<Button isLoading size="icon" aria-label="Sil" />);

    const status = screen.getByText('İşleniyor…');
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('sr-only');
  });

  it('yükleme sırasında meşgul olduğunu bildirir', () => {
    render(<Button isLoading>Kaydet</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('asChild ile sarmalanan bağlantı yükleme içeriğiyle bozulmaz', () => {
    // Slot tek çocuk bekler; yükleme göstergesi eklenirse çalışma anında çöker.
    render(
      <Button asChild isLoading>
        <a href="/urunler">Ürünler</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Ürünler' })).toBeInTheDocument();
  });

  /**
   * `asChild` ile sarmalanan bağlantı gerçekten devre dışı kalır.
   *
   * `disabled` özniteliği `<a>` üzerinde hiçbir şey yapmaz: tarayıcı yok sayar
   * ve `:disabled` eşleşmediği için varyantlardaki `disabled:pointer-events-none`
   * de uygulanmaz. Bağlantı normal görünüyor ve tıklandığında gezindiriyordu.
   */
  it('asChild ile sarmalanan bağlantı devre dışı bırakılabilir', () => {
    render(
      <Button asChild disabled>
        <a href="/odeme">Siparişi Tamamla</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Siparişi Tamamla' });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    // Klavye kullanıcısı da erişememeli.
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveClass('pointer-events-none');
    // Geçersiz öznitelik bağlantıya yazılmaz.
    expect(link).not.toHaveAttribute('disabled');
  });

  it('devre dışı olmayan bağlantı işaretlenmez', () => {
    render(
      <Button asChild>
        <a href="/urunler">Ürünler</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Ürünler' });

    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('tabindex');
  });

  it('devre dışıyken tıklanamaz', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Kaydet
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
