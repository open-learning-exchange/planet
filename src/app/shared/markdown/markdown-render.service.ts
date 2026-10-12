import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as showdown from 'showdown';

export type MarkdownProfile = 'default' | 'chat';

const PLANET_MARKDOWN_OPTIONS = Object.freeze({
  disableForced4SpacesIndentedSublists: true,
  emoji: true,
  ghCodeBlocks: true,
  literalMidWordUnderscores: true,
  noHeaderId: true,
  simpleLineBreaks: false,
  simplifiedAutoLink: false,
  strikethrough: true,
  tables: true,
  tasklists: true
});

const CHAT_MARKDOWN_OPTIONS = Object.freeze({
  ...PLANET_MARKDOWN_OPTIONS,
  simpleLineBreaks: true,
  simplifiedAutoLink: true
});

const safeLinkProtocols = [ 'http:', 'https:', 'mailto:', 'tel:' ];
const safeMediaProtocols = [ 'http:', 'https:' ];
const mediaUrlAttributes: [ string, string ][] = [
  [ 'img[src]', 'src' ],
  [ 'video[src]', 'src' ],
  [ 'video[poster]', 'poster' ],
  [ 'audio[src]', 'src' ],
  [ 'source[src]', 'src' ]
];
const safeImageDataUrl = /^data:image\/(bmp|gif|jpeg|jpg|png|tiff|webp);/i;

const markdownContainerRegex = /<(div|section|article|aside|header|footer|nav|blockquote|figure)(\s[^>]*)?>/gi;
const codeSpanRegex = /(`+)[\s\S]*?\1/g;

@Injectable({ providedIn: 'root' })
export class MarkdownRenderService {
  private readonly converters = {
    default: this.createConverter(PLANET_MARKDOWN_OPTIONS),
    chat: this.createConverter(CHAT_MARKDOWN_OPTIONS)
  };

  constructor(private sanitizer: DomSanitizer) {}

  render(markdown: string, hostedUrl = '', profile: MarkdownProfile = 'default'): string {
    const parsed = this.parseMarkdown(markdown, profile);
    this.normalizeForDisplay(parsed, hostedUrl);

    return this.sanitizeHtml(parsed.body.innerHTML);
  }

  toPlainText(markdown: any) {
    if (typeof markdown !== 'string') {
      return markdown;
    }
    return (this.parseMarkdown(markdown, 'default').body.textContent || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  sanitizeHtml(html: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }

  resolveHostedUrl(url: string, hostedUrl: string): string {
    if (!hostedUrl || !url || this.isAbsoluteOrSpecialUrl(url)) {
      return url;
    }

    try {
      const relativeUrl = url.replace(/^\/+/, '');
      return new URL(relativeUrl, hostedUrl.endsWith('/') ? hostedUrl : `${hostedUrl}/`).href;
    } catch {
      return url;
    }
  }

  headingId(value: string) {
    return value
      .replace(/(_|-|\s)+/g, '')
      .replace(/[&+$,/:;=?@"#{}|^~[\]`\\*)(%.!'<>]/g, '')
      .toLowerCase();
  }

  private createConverter(options: object) {
    const converter = new showdown.Converter({ ...options });
    converter.listen('hashHTMLBlocks.before', (_event, text: string) => this.markContainersAsMarkdown(text));
    return converter;
  }

  private markContainersAsMarkdown(text: string) {
    const codeSpans: string[] = [];
    let placeholder = 'planetmd';
    while (text.includes(placeholder)) {
      placeholder += 'x';
    }
    return text
      .replace(codeSpanRegex, match => `${placeholder}${codeSpans.push(match) - 1}`)
      .replace(markdownContainerRegex, (match, tag, attributes = '') =>
        /\bmarkdown\s*=/i.test(attributes) ? match : `<${tag}${attributes} markdown="1">`)
      .replace(new RegExp(`${placeholder}(\\d+)`, 'g'), (match, index) => codeSpans[Number(index)] ?? match);
  }

  private parseMarkdown(markdown: any, profile: MarkdownProfile): Document {
    const source = String(markdown ?? '');
    const document = new DOMParser().parseFromString(this.converters[profile].makeHtml(source), 'text/html');

    this.replaceTaskListInputs(document);
    return document;
  }

  private normalizeForDisplay(document: Document, hostedUrl: string) {
    this.normalizeTableAlignment(document);
    this.normalizeLinks(document, hostedUrl);
    this.normalizeMediaUrls(document, hostedUrl);
  }

  private replaceTaskListInputs(document: Document) {
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
      const marker = document.createElement('span');
      marker.classList.add('markdown-task-checkbox');
      marker.setAttribute('aria-checked', input.checked.toString());
      marker.setAttribute('aria-disabled', 'true');
      marker.setAttribute('role', 'checkbox');
      marker.textContent = input.checked ? '☑' : '☐';
      input.closest('li')?.removeAttribute('style');
      input.replaceWith(marker);
    });
  }

  private normalizeTableAlignment(document: Document) {
    document.querySelectorAll<HTMLElement>('th[style], td[style]').forEach(cell => {
      const alignment = cell.style.textAlign;
      if ([ 'left', 'center', 'right' ].includes(alignment)) {
        cell.classList.add(`markdown-align-${alignment}`);
      }
      cell.removeAttribute('style');
    });
  }

  private normalizeLinks(document: Document, hostedUrl: string) {
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
      const originalHref = link.getAttribute('href') || '';

      if (originalHref.startsWith('#')) {
        return;
      }
      if (hostedUrl && this.isRelativeMarkdownUrl(originalHref)) {
        link.setAttribute('href', this.resolveHostedMarkdownUrl(originalHref, hostedUrl));
      }

      const url = this.parseUrl(link.getAttribute('href') || '');
      if (!url || !safeLinkProtocols.includes(url.protocol)) {
        link.removeAttribute('href');
        return;
      }
      if ([ 'http:', 'https:' ].includes(url.protocol) && url.origin !== window.location.origin) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  private normalizeMediaUrls(document: Document, hostedUrl: string) {
    mediaUrlAttributes.forEach(([ selector, attribute ]) => {
      document.querySelectorAll(selector).forEach(element => {
        const source = this.resolveHostedUrl(element.getAttribute(attribute) || '', hostedUrl);
        const url = this.parseUrl(source);
        const isSafe = url &&
          (safeMediaProtocols.includes(url.protocol) || (url.protocol === 'data:' && safeImageDataUrl.test(source)));
        if (!isSafe) {
          element.removeAttribute(attribute);
          return;
        }
        element.setAttribute(attribute, source);
      });
    });
  }

  private resolveHostedMarkdownUrl(url: string, hostedUrl: string) {
    const [ path, fragment ] = url.split('#');
    const resolved = this.resolveHostedUrl(path, hostedUrl);
    return fragment === undefined ? resolved : `${resolved}#${this.headingId(fragment)}`;
  }

  private parseUrl(url: string) {
    try {
      return new URL(url, window.location.href);
    } catch {
      return undefined;
    }
  }

  private isRelativeMarkdownUrl(url: string) {
    const path = url.split(/[?#]/, 1)[0];
    return !this.isAbsoluteOrSpecialUrl(url) && path.toLowerCase().endsWith('.md');
  }

  private isAbsoluteOrSpecialUrl(url: string) {
    return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);
  }
}
