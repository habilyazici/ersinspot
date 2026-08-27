/**
 * Markdown görüntüleyici testleri.
 *
 * Bileşenin iddiası şudur: içerikten kaynaklanan bir betik enjeksiyonu mümkün
 * değildir. İddia edilip doğrulanmayan güvenlik, güvenlik değildir — bu yüzden
 * kötü niyetli girdiler burada açıkça denenir.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown.tsx';

function show(content: string): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <Markdown content={content} />
    </MemoryRouter>,
  );

  return container;
}

describe('Markdown görüntüleyici', () => {
  it('paragrafları ayırır', () => {
    show('Birinci paragraf.\n\nİkinci paragraf.');

    expect(screen.getByText('Birinci paragraf.')).toBeInTheDocument();
    expect(screen.getByText('İkinci paragraf.')).toBeInTheDocument();
  });

  it('başlıkları doğru düzeyde üretir', () => {
    show('## Ana Başlık\n\n### Alt Başlık');

    expect(screen.getByRole('heading', { level: 2, name: 'Ana Başlık' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Alt Başlık' })).toBeInTheDocument();
  });

  it('madde ve numaralı listeleri üretir', () => {
    const container = show('- birinci\n- ikinci\n\n1. adım bir\n2. adım iki');

    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('kalın ve eğik vurguyu uygular', () => {
    const container = show('Bu **kalın** ve bu *eğik*.');

    expect(container.querySelector('strong')?.textContent).toBe('kalın');
    expect(container.querySelector('em')?.textContent).toBe('eğik');
  });

  // ---------------------------------------------------------------------------
  // Güvenlik
  // ---------------------------------------------------------------------------

  it('ham HTML çalıştırmaz, metin olarak gösterir', () => {
    const container = show('<script>alert(1)</script>');

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('img onerror gibi öznitelikleri işlemez', () => {
    const container = show('<img src=x onerror="alert(1)">');

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('onerror');
  });

  it('javascript: bağlantısını bağlantıya çevirmez', () => {
    /*
      React `href` özniteliğini kaçırmaz: `javascript:` şeması bir anchor'a
      yazılırsa tıklamada çalışır. Bu yüzden denetim bileşenin içindedir.
    */
    const container = show('[tıkla](javascript:alert(1))');

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('tıkla');
  });

  it('data: bağlantısını bağlantıya çevirmez', () => {
    const container = show('[tıkla](data:text/html;base64,PHNjcmlwdD4=)');

    expect(container.querySelector('a')).toBeNull();
  });

  it('protokolsüz adresi site içi sanıp bağlantıya çevirmez', () => {
    /*
      `//kotu-site.com` eğik çizgiyle başlar ama site içi DEĞİLDİR: tarayıcı
      onu protokolsüz bir dış adres sayar. Site içi sanılıp tıklanan bir
      bağlantı kullanıcıyı habersizce başka bir siteye götürürdü.
    */
    const container = show('[tıkla](//kotu-site.com)');

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('tıkla');
  });

  it('ters eğik çizgili adresi de reddeder', () => {
    // Bazı tarayıcılar `/\host` yazımını `//host` gibi yorumlar.
    const container = show(String.raw`[tıkla](/\kotu-site.com)`);

    expect(container.querySelector('a')).toBeNull();
  });

  it('http (şifresiz) dış bağlantıyı kabul etmez', () => {
    const container = show('[tıkla](http://ornek.com)');

    expect(container.querySelector('a')).toBeNull();
  });

  it('büyük harfli şema yazımı denetimi atlatamaz', () => {
    // Şema, dizge karşılaştırmasıyla değil URL ayrıştırıcısıyla denetlenir.
    const container = show('[tıkla](JaVaScRiPt:alert(1))');

    expect(container.querySelector('a')).toBeNull();
  });

  it('https bağlantısını yeni sekmede ve rel korumasıyla açar', () => {
    const container = show('[site](https://ornek.com)');
    const anchor = container.querySelector('a');

    // Adres `URL` ile normalleştirilir; kök yol için sondaki eğik çizgi eklenir.
    expect(anchor?.getAttribute('href')).toBe('https://ornek.com/');
    expect(anchor?.getAttribute('rel')).toContain('noopener');
    expect(anchor?.getAttribute('target')).toBe('_blank');
  });

  it('site içi bağlantıyı yönlendirici bağlantısı olarak üretir', () => {
    const container = show('[ürünler](/urunler)');
    const anchor = container.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('/urunler');
    // Site içi bağlantı yeni sekmede açılmaz.
    expect(anchor?.getAttribute('target')).toBeNull();
  });

  it('desteklenmeyen işareti düz metin olarak bırakır, içeriği kaybetmez', () => {
    const container = show('| tablo | başlık |\n| --- | --- |');

    expect(container.textContent).toContain('tablo');
  });
});
