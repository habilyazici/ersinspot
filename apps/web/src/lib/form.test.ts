/**
 * Form yardımcılarının testleri.
 */

import { describe, expect, it } from 'vitest';
import { describedByFor } from './form.ts';

describe('aria-describedby', () => {
  const ids = { hintId: 'alan-yardim', errorId: 'alan-hata' };

  it('hata varken yalnızca hatayı gösterir', () => {
    /*
      Hata çizildiğinde yardım metni çizilmez. İkisini birden bildirmek, var
      olmayan bir kimliğe işaret eden bir öznitelik bırakırdı.
    */
    expect(describedByFor({ ...ids, hasHint: true, hasError: true })).toBe('alan-hata');
  });

  it('hata yokken yardım metnini gösterir', () => {
    expect(describedByFor({ ...ids, hasHint: true, hasError: false })).toBe('alan-yardim');
  });

  it('ikisi de yoksa öznitelik hiç yazılmaz', () => {
    expect(describedByFor({ ...ids, hasHint: false, hasError: false })).toBeUndefined();
  });
});
