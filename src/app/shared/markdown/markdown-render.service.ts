import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import MarkdownIt, { StateBlock } from 'markdown-it';
import { full as emoji } from 'markdown-it-emoji';

export type MarkdownProfile = 'default' | 'chat';

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

const markdownContainerRegex = /^ {0,3}<(div|section|article|aside|header|footer|nav|blockquote|figure)(\s[^>]*)?>/i;
// Deeper containers render as plain HTML, which bounds how often a crafted post is rescanned and re-rendered
const maxContainerDepth = 20;
const taskMarkerRegex = /^\[([ xX])\](?=\s)/;

// markdown-it percent-encodes destinations, so URLs and fragments are read decoded; a malformed escape is read as written
const decodeOrKeep = (value: string, decode: (encoded: string) => string) => {
  try {
    return decode(value);
  } catch {
    return value;
  }
};

const containerCloseEnd = (source: string, tag: string, from: number) => {
  // [^<>] keeps each attempt from running to the end of a post full of unclosed tags
  const tags = new RegExp(`<(/?)${tag}(?:\\s[^<>]*)?>`, 'gi');
  tags.lastIndex = from;
  let depth = 1;
  for (let match = tags.exec(source); match && depth <= maxContainerDepth; match = tags.exec(source)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      return tags.lastIndex;
    }
  }
  return -1;
};

// CommonMark keeps a line-opening <div> and what follows as raw HTML until a blank line. Showdown rendered
// Markdown up to the matching close tag, and content written for it keeps rendering that way here.
const markdownContainer = (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
  const depth = state.env.containerDepth ?? 0;
  const lineStart = state.bMarks[startLine] + state.tShift[startLine];
  const open = depth < maxContainerDepth && state.sCount[startLine] - state.blkIndent < 4 &&
    markdownContainerRegex.exec(state.src.slice(lineStart, state.eMarks[startLine]));
  const closeEnd = open ? containerCloseEnd(state.src, open[1], lineStart + open[0].length) : -1;
  let closeLine = startLine;
  while (closeLine < endLine && state.eMarks[closeLine] < closeEnd) {
    closeLine++;
  }
  if (!open || closeEnd < 0 || closeLine >= endLine || state.src.slice(closeEnd, state.eMarks[closeLine]).trim()) {
    return false;
  }
  if (silent) {
    return true;
  }

  const openTag = open[0].trim();
  const text = state.getLines(startLine, closeLine + 1, state.blkIndent, false).trim();
  const token = state.push('html_block', '', 0);
  const inner = state.md.render(text.slice(openTag.length, text.lastIndexOf('<')), { containerDepth: depth + 1 });
  token.content = `${openTag}\n${inner}</${open[1]}>\n`;
  state.line = closeLine + 1;
  return true;
};

@Injectable({ providedIn: 'root' })
export class MarkdownRenderService {
  private readonly parsers = {
    default: this.createParser({}),
    chat: this.createParser({ breaks: true, linkify: true })
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
    return decodeOrKeep(value, decodeURIComponent)
      .replace(/(_|-|\s)+/g, '')
      .replace(/[&+$,/:;=?@"#{}|^~[\]`\\*)(%.!'<>]/g, '')
      .toLowerCase();
  }

  private createParser(options: { breaks?: boolean, linkify?: boolean }) {
    const parser = new MarkdownIt({ html: true, ...options }).use(emoji, { shortcuts: {} });
    // normalizeLinks and normalizeMediaUrls judge every URL, raw HTML included, so links aren't dropped to text here
    parser.validateLink = () => true;
    parser.block.ruler.before('html_block', 'markdown_container', markdownContainer, {
      alt: [ 'paragraph', 'reference', 'blockquote' ]
    });
    return parser;
  }

  private parseMarkdown(markdown: any, profile: MarkdownProfile): Document {
    const source = String(markdown ?? '');
    const document = new DOMParser().parseFromString(this.parsers[profile].render(source), 'text/html');

    this.replaceTaskListMarkers(document);
    return document;
  }

  private normalizeForDisplay(document: Document, hostedUrl: string) {
    this.normalizeTableAlignment(document);
    this.normalizeLinks(document, hostedUrl);
    this.normalizeMediaUrls(document, hostedUrl);
  }

  private replaceTaskListMarkers(document: Document) {
    document.querySelectorAll('li').forEach(item => {
      const text = (item.firstElementChild?.tagName === 'P' ? item.firstElementChild : item).firstChild;
      const content = text?.nodeType === Node.TEXT_NODE ? text.textContent || '' : '';
      const match = taskMarkerRegex.exec(content);
      if (!text || !match) {
        return;
      }
      text.textContent = content.slice(match[0].length);
      text.before(this.taskMarker(document, match[1] !== ' '));
      item.classList.add('task-list-item');
    });
    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
      input.replaceWith(this.taskMarker(document, input.checked));
    });
  }

  private taskMarker(document: Document, checked: boolean) {
    const marker = document.createElement('span');
    marker.classList.add('markdown-task-checkbox');
    marker.setAttribute('aria-checked', checked.toString());
    marker.setAttribute('aria-disabled', 'true');
    marker.setAttribute('role', 'checkbox');
    marker.textContent = checked ? '☑' : '☐';
    return marker;
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
      return new URL(decodeOrKeep(url, decodeURI), window.location.href);
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
