/**
 * Silme onayı testleri.
 *
 * Yönetim panelindeki silme düğmeleri tek tıkla çalışıyordu. Blog yazısı ve
 * SSS kaydı veritabanından gerçekten silindiği için yanlış satırdaki çöp
 * kutusuna basmak içeriği kalıcı olarak kaybettiriyordu.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDelete } from './confirm-delete.tsx';

describe('silme onayı', () => {
  it('ilk tıklamada silmez, önce sorar', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDelete
        label="Yazıyı sil"
        question="Kalıcı olarak silinecek."
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yazıyı sil' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Kalıcı olarak silinecek.')).toBeInTheDocument();
  });

  it('onaylandığında siler', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDelete
        label="Yazıyı sil"
        question="Kalıcı olarak silinecek."
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yazıyı sil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sil' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('vazgeçildiğinde silmez ve tetikleyiciye döner', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDelete
        label="Yazıyı sil"
        question="Kalıcı olarak silinecek."
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yazıyı sil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Yazıyı sil' })).toBeInTheDocument();
  });
});
