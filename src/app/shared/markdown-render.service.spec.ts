import { TestBed } from '@angular/core/testing';
import { MarkdownRenderService } from './markdown-render.service';

const inspect = (html: string) => {
  const elements = Array.from(new DOMParser().parseFromString(html, 'text/html').body.querySelectorAll('*'));
  return {
    handlers: elements.flatMap(element =>
      Array.from(element.attributes).filter(attribute => /^on/i.test(attribute.name)).map(attribute => attribute.name)),
    activeElements: elements
      .filter(element => /^(script|iframe|object|embed|svg|form|style|link|meta|base)$/i.test(element.tagName))
      .map(element => element.tagName.toLowerCase()),
    urls: elements.flatMap(element =>
      [ 'href', 'src', 'action', 'srcset', 'poster' ].map(attribute => element.getAttribute(attribute)))
      .filter((url): url is string => url !== null)
  };
};

describe('MarkdownRenderService', () => {
  let service: MarkdownRenderService;

  beforeEach(() => {
    service = TestBed.inject(MarkdownRenderService);
  });

  describe('security corpus', () => {
    const payloads: [ string, string ][] = [
      [ 'nested link label', '[x [y]](javascript:alert(1))' ],
      [ 'escaped link label', '[x \\] y](javascript:alert(2))' ],
      [ 'quote injection in an image destination', '![x](bad"onerror="alert(3))' ],
      [ 'quote injection in an anchor destination', '[x](bad"onmouseover="alert(4))' ],
      [ 'inline destination', '[x](javascript:alert(5))' ],
      [ 'reference destination', '[x][ref]\n\n[ref]: javascript:alert(6)' ],
      [ 'next-line reference destination', '[x][ref]\n\n[ref]:\njavascript:alert(7)' ],
      [ 'adjacent reference definitions', '[a][one] [b][two]\n\n[one]:\njavascript:alert(8)\n[two]: https://example.org' ],
      [ 'entity-obfuscated scheme', '[x](&#106;avascript:alert(9))' ],
      [ 'named-entity scheme', '[x](javascript&colon;alert(10))' ],
      [ 'whitespace control in a scheme', '[x](java&Tab;script:alert(11))' ],
      [ 'data: document destination', '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)' ],
      [ 'data: image with a scriptable type', '![x](data:image/svg+xml;base64,PHN2Zy9vbmxvYWQ9YWxlcnQoMSk+)' ],
      [ 'raw script element', '<script>alert(12)</script>' ],
      [ 'raw event attribute', '<img src="x" onerror="alert(13)">' ],
      [ 'raw iframe', '<iframe src="https://example.test"></iframe>' ],
      [ 'raw svg handler', '<svg onload=alert(14)></svg>' ],
      [ 'raw form', '<form action="https://example.test"><input name="a"></form>' ],
      [ 'style url', '<div style="background:url(javascript:alert(15))">x</div>' ],
      [ 'handler on a markdown-parsed container', '<div markdown="1" onclick="alert(16)">**x**</div>' ]
    ];

    payloads.forEach(([ name, markdown ]) => {
      it(`leaves nothing active for ${name}`, () => {
        const { handlers, activeElements, urls } = inspect(service.render(markdown, 'https://couch.test/'));

        expect(handlers).toEqual([]);
        expect(activeElements).toEqual([]);
        expect(urls.filter(url => /^\s*(javascript|vbscript|unsafe|data:text)/i.test(url))).toEqual([]);
      });
    });

    it('drops an unusable scheme rather than leaving an unsafe: URL for a protocol handler', () => {
      const rendered = service.render('[x](javascript:alert(1))\n\n[y](ftp://example.org/f)');
      const links = Array.from(new DOMParser().parseFromString(rendered, 'text/html').querySelectorAll('a'));

      expect(links.length).toBe(2);
      expect(links.every(link => !link.hasAttribute('href'))).toBe(true);
    });
  });

  describe('content compatibility', () => {
    const rendered = (markdown: string, hostedUrl = '') =>
      new DOMParser().parseFromString(service.render(markdown, hostedUrl), 'text/html').body;

    it('keeps fenced code containing HTML verbatim', () => {
      expect(rendered('```html\n<div class="x">safe</div>\n```').querySelector('pre code')?.textContent)
        .toContain('<div class="x">safe</div>');
    });

    it('keeps inline code containing markdown links and uncommon schemes verbatim', () => {
      expect(rendered('use `[dl](ftp://host/f)` and `<div>**x**</div>`').querySelectorAll('code')[0].textContent)
        .toBe('[dl](ftp://host/f)');
    });

    it('links angle-bracket autolinks', () => {
      expect(rendered('<https://example.org>').querySelector('a')?.getAttribute('href')).toBe('https://example.org');
    });

    it('keeps safe schemes, relative paths and fragments', () => {
      const hrefs = Array.from(rendered([
        '[web](https://example.org)',
        '[mail](mailto:person@example.org)',
        '[phone](tel:+254700000000)',
        '[relative](/courses/1)',
        '[fragment](#Section)'
      ].join('\n\n')).querySelectorAll('a')).map(link => link.getAttribute('href'));

      expect(hrefs).toEqual([
        'https://example.org', 'mailto:person@example.org', 'tel:+254700000000', '/courses/1', '#Section'
      ]);
    });

    it('resolves hosted images and markdown links against the hosted URL', () => {
      const body = rendered('![i](img/a.png)\n\n[part](other.md#my-heading)', 'https://couch.test/db/');

      expect(body.querySelector('img')?.getAttribute('src')).toBe('https://couch.test/db/img/a.png');
      expect(body.querySelector('a')?.getAttribute('href')).toBe('https://couch.test/db/other.md#myheading');
    });

    it('allows inline raster images', () => {
      expect(rendered('![c](data:image/png;base64,iVBORw0KGgo=)').querySelector('img')?.getAttribute('src'))
        .toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('rebases hosted media the same way as images', () => {
      const body = rendered(
        '<video src="clip.mp4" poster="still.png"></video>\n\n<audio><source src="track.mp3"></audio>',
        'https://couch.test/db/'
      );

      expect(body.querySelector('video')?.getAttribute('src')).toBe('https://couch.test/db/clip.mp4');
      expect(body.querySelector('video')?.getAttribute('poster')).toBe('https://couch.test/db/still.png');
      expect(body.querySelector('source')?.getAttribute('src')).toBe('https://couch.test/db/track.mp3');
    });

    it('drops a media URL whose scheme is not usable', () => {
      expect(rendered('<video src="javascript:alert(1)"></video>').querySelector('video')?.hasAttribute('src'))
        .toBe(false);
    });

    it('leaves unbalanced, nested and placeholder-like container text alone', () => {
      expect(rendered('<div>\n\n<div>**inner**</div>\n\n</div>').querySelectorAll('div strong').length).toBe(1);
      expect(rendered('text with a stray <div> and no close').textContent).toContain('text with a stray');
      expect(rendered('`code` and literal planetmd0 text').textContent).toContain('planetmd0');
      expect(rendered('`<div>` then <div>**x**</div>').querySelector('code')?.textContent).toBe('<div>');
    });

    it('keeps sanitizer-approved raw HTML and parses markdown inside it', () => {
      const body = rendered('<strong>bold</strong> and <br> break\n\n<div>**inside**</div>');

      expect(body.querySelector('strong')?.textContent).toBe('bold');
      expect(body.querySelector('br')).toBeTruthy();
      expect(body.querySelector('div strong')?.textContent).toBe('inside');
    });

    it('renders tables, task lists, emoji and strikethrough', () => {
      const body = rendered('| a | b |\n|:--|--:|\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~ :smile:');

      expect(body.querySelector('td.markdown-align-right')).toBeTruthy();
      expect(body.querySelector('.markdown-task-checkbox')?.textContent).toBe('☑');
      expect(body.querySelector('del')?.textContent).toBe('gone');
      expect(body.textContent).toContain('😄');
    });

    it('renders chat line breaks and bare URLs only under the chat profile', () => {
      const chat = new DOMParser()
        .parseFromString(service.render('one\nsee https://example.org', '', 'chat'), 'text/html').body;

      expect(chat.querySelector('br')).toBeTruthy();
      expect(chat.querySelector('a')?.getAttribute('href')).toBe('https://example.org');
      expect(rendered('one\nsee https://example.org').querySelector('a')).toBeFalsy();
    });
  });

  describe('toPlainText', () => {
    it('strips formatting while keeping the text the page shows', () => {
      expect(service.toPlainText('# Title\n\n**bold** text')).toBe('Title\nbold text');
      expect(service.toPlainText('- [x] done\n- [ ] todo')).toBe('☑ done\n☐ todo');
      expect(service.toPlainText('~~gone~~ :smile:')).toBe('gone 😄');
      expect(service.toPlainText('| a | b |\n|---|---|\n| 1 | 2 |')).toBe('a\nb\n1\n2');
    });

    it('passes non-strings through untouched', () => {
      expect(service.toPlainText(42)).toBe(42);
      expect(service.toPlainText(undefined)).toBe(undefined);
    });

    it('builds nothing in the live document', () => {
      const before = document.body.childNodes.length;

      expect(service.toPlainText('![x](bad"onerror="alert(1))')).toBe('');
      expect(document.body.childNodes.length).toBe(before);
    });
  });
});
