/**
 * Markdown alt kümesi görüntüleyici.
 *
 * Blog içeriği Markdown olarak saklanır. Bu bileşen onu REACT ELEMANLARINA
 * çevirir — HTML dizesine değil. `dangerouslySetInnerHTML` hiç kullanılmaz,
 * React tüm metni kendiliğinden kaçırır; dolayısıyla içerikten kaynaklanan bir
 * betik enjeksiyonu yapısal olarak mümkün değildir. Bir arındırma kütüphanesine
 * (DOMPurify vb.) ihtiyaç duyulmamasının sebebi budur.
 *
 * DESTEKLENEN ALT KÜME bilinçlidir. Yazılar mağaza personeli tarafından yazılır
 * ve düz metin, başlık, liste ve bağlantıdan fazlasına ihtiyaç duymaz:
 *
 *   ## Başlık            → h2
 *   ### Alt başlık       → h3
 *   - madde / 1. madde   → liste
 *   **kalın**, *eğik*    → vurgu
 *   [metin](/adres)      → bağlantı (yalnızca site içi ve https)
 *   > alıntı             → alıntı bloğu
 *
 * Desteklenmeyen bir işaret (tablo, görsel, kod bloğu) düz metin olarak görünür;
 * bozulmaz, yalnızca biçimlenmez.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Satır içi biçimlendirmeyi React parçalarına çevirir. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  /*
    Tek geçişte üç kalıp aranır: bağlantı, kalın, eğik. Yakalama grupları
    sırayla değerlendirilir; eşleşmeyen aralıklar düz metin olarak kalır.
  */
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${String(index)}`;
    index += 1;

    const [, linkText, href, bold, italic] = match;

    if (linkText !== undefined && href !== undefined) {
      parts.push(renderLink(linkText, href, key));
    } else if (bold !== undefined) {
      parts.push(<strong key={key}>{bold}</strong>);
    } else if (italic !== undefined) {
      parts.push(<em key={key}>{italic}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Bağlantı adresini doğrular ve normalleştirir.
 *
 * İki kabul edilen biçim vardır; başka her şey düz metin olarak kalır:
 *
 *   /yol      site içi — TEK eğik çizgiyle başlamalı
 *   https://  dış bağlantı — şema açıkça https olmalı
 *
 * `//kotu-site.com` de eğik çizgiyle başlar ama PROTOKOLSÜZ bir dış adrestir:
 * site içi sanılıp tıklanır ve kullanıcı başka bir siteye gider. Bazı
 * tarayıcılar `/\kotu-site.com` yazımını da aynı şekilde yorumlar. İkisi de
 * burada reddedilir.
 *
 * Dış adres `URL` ile ayrıştırılır; şema kontrolü dizgeyle değil ayrıştırıcıyla
 * yapılır, böylece `HtTpS:` gibi yazımlar veya boşluk kaçamağı kalmaz.
 *
 * Adres, ayrıştırıcının çıktısı olduğu gibi geçirilmez: sabit `https://` ön eki
 * ile PARÇALARINDAN YENİDEN KURULUR. Bunun iki sebebi var. Birincisi güvenlik:
 * `https://kullanici:sifre@site.com` biçimindeki gömülü kimlik bilgisi
 * bağlantının nereye gittiğini gizler ve bilinen bir kimlik avı yöntemidir;
 * yeniden kurmak onu düşürür. İkincisi, çıktının hangi parçalardan oluştuğu
 * okunurken görünür olur.
 */
function safeHref(href: string): { kind: 'internal' | 'external'; href: string } | null {
  const trimmed = href.trim();

  if (trimmed.startsWith('/')) {
    // İkinci karakter eğik çizgi veya ters eğik çizgi ise site dışıdır.
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
    return { kind: 'internal', href: trimmed };
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'https:') return null;

    // Gömülü kimlik bilgisi taşıyan adres hiç kabul edilmez.
    if (parsed.username !== '' || parsed.password !== '') return null;

    if (parsed.host === '') return null;

    return {
      kind: 'external',
      href: `https://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return null;
  }
}

/**
 * Bağlantı.
 *
 * Doğrulanmayan adres bağlantıya çevrilmez, metin olarak kalır. React `href`
 * özniteliğini kaçırmaz — `javascript:` bir anchor'a yazılırsa tıklamada
 * çalışır — bu yüzden denetim burada yapılır.
 */
function renderLink(text: string, href: string, key: string): ReactNode {
  const safe = safeHref(href);

  if (safe === null) {
    return <span key={key}>{text}</span>;
  }

  const className = 'font-medium text-brand-navy-700 hover:underline';

  return safe.kind === 'internal' ? (
    <Link key={key} to={safe.href} className={className}>
      {text}
    </Link>
  ) : (
    <a key={key} href={safe.href} className={className} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
}

export interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  // Boş satırlar blokları ayırır; Windows satır sonları da normalleştirilir.
  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const key = `blok-${String(blockIndex)}`;
        const trimmed = block.trim();

        if (trimmed === '') return null;

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={key} className="mt-6 text-lg font-semibold text-slate-900">
              {renderInline(trimmed.slice(4), key)}
            </h3>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={key} className="mt-8 text-xl font-bold text-slate-900">
              {renderInline(trimmed.slice(3), key)}
            </h2>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={key}
              className="mt-4 border-l-4 border-brand-orange-200 pl-4 text-slate-600"
            >
              {renderInline(trimmed.replace(/^> ?/gm, ''), key)}
            </blockquote>
          );
        }

        const lines = trimmed.split('\n');

        if (lines.every((line) => /^[-*] /.test(line.trim()))) {
          return (
            <ul key={key} className="mt-4 list-disc space-y-1 pl-5 text-slate-700">
              {lines.map((line, lineIndex) => (
                <li key={`${key}-${String(lineIndex)}`}>
                  {renderInline(line.trim().slice(2), `${key}-${String(lineIndex)}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\. /.test(line.trim()))) {
          return (
            <ol key={key} className="mt-4 list-decimal space-y-1 pl-5 text-slate-700">
              {lines.map((line, lineIndex) => (
                <li key={`${key}-${String(lineIndex)}`}>
                  {renderInline(
                    line.trim().replace(/^\d+\.\s*/, ''),
                    `${key}-${String(lineIndex)}`,
                  )}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={key} className="mt-4 leading-relaxed text-slate-700">
            {renderInline(trimmed, key)}
          </p>
        );
      })}
    </div>
  );
}
