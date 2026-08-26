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
