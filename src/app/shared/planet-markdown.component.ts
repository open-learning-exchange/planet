import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, Renderer2,
  ViewChild, ViewEncapsulation
} from '@angular/core';
import { environment } from '../../environments/environment';
import { StateService } from './state.service';
import { calculateMdAdjustedLimit, extractMarkdownImageUrls, getMarkdownPreviewText,
  normalizeMarkdownWhitespace, truncateText
} from './utils';
import { MarkdownProfile, MarkdownRenderService } from './markdown-render.service';

@Component({
  selector: 'planet-markdown',
  host: { class: 'planet-markdown-renderer' },
  template: `
    <div #markdownContent class="markdown-content" [innerHTML]="renderedContent"></div>
    @if (previewMode && images?.length) {
      <div class="image-gallery">
        @for (image of images; track image) {
          <img [src]="image" class="minified-image" alt="Preview Image" i18n-alt />
        }
      </div>
    }
    `,
  styleUrls: ['./planet-markdown.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PlanetMarkdownComponent implements OnChanges, AfterViewChecked, OnDestroy {

  @ViewChild('markdownContent') markdownContent: ElementRef<HTMLElement>;
  @Input() content: string;
  @Input() imageSource: 'parent' | 'local' = 'local';
  @Input() previewMode: boolean;
  @Input() limit = 450;
  @Input() profile: MarkdownProfile = 'default';
  couchAddress: string;
  images: string[] = [];
  renderedContent = '';
  private needsPostRender = false;
  private copyListeners: (() => void)[] = [];

  constructor(
    private stateService: StateService,
    private markdownRenderer: MarkdownRenderService,
    private renderer: Renderer2
  ) {}

  ngOnChanges() {
    this.couchAddress = this.imageSource === 'parent' ?
      `${environment.parentProtocol}://${this.stateService.configuration.parentDomain}/` :
      `${environment.couchAddress}/`;

    const normalizedContent = normalizeMarkdownWhitespace(this.content);
    this.images = this.extractImageUrls(normalizedContent);

    if (this.previewMode) {
      const previewText = getMarkdownPreviewText(normalizedContent);
      const limitedContent = truncateText(previewText, calculateMdAdjustedLimit(previewText, this.limit));
      this.renderedContent = this.markdownRenderer.render(limitedContent, '', this.profile);
    } else {
      this.renderedContent = this.markdownRenderer.render(normalizedContent, this.couchAddress, this.profile);
    }
    this.needsPostRender = true;
  }

  ngAfterViewChecked() {
    if (!this.needsPostRender) {
      return;
    }
    this.needsPostRender = false;
    this.applyFragmentIds();
    if (this.profile === 'chat') {
      this.addCopyButtons();
    }
  }

  ngOnDestroy() {
    this.clearCopyListeners();
  }

  extractImageUrls(content: string): string[] {
    return extractMarkdownImageUrls(content).map(url => this.markdownRenderer.resolveHostedUrl(url, this.couchAddress));
  }

  // The sanitizer strips ids, so they are reapplied here. They stay canonical rather than
  // instance-scoped so that a link from another document still resolves.
  private applyFragmentIds() {
    const container = this.markdownContent.nativeElement;
    container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const id = this.markdownRenderer.headingId(heading.textContent || '');
      if (id) {
        heading.id = id;
      }
    });
    container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
      const fragment = this.markdownRenderer.headingId(link.getAttribute('href').slice(1));
      if (fragment) {
        link.setAttribute('href', `#${fragment}`);
      }
    });
  }

  // Scoped to this instance because several cards can repeat a heading id, and handling the
  // scroll here keeps an in-page fragment out of the router's history.
  @HostListener('click', [ '$event' ])
  scrollToFragment(event: MouseEvent) {
    const link = (event.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement;
    const fragment = link?.getAttribute('href')?.slice(1);
    if (!fragment) {
      return;
    }
    const target = this.markdownContent.nativeElement.querySelector(`[id="${CSS.escape(fragment)}"]`);
    if (!target) {
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // The button sits in a wrapper rather than inside the <pre>, so "Copy" stays out of the
  // code block's own text.
  private addCopyButtons() {
    const container = this.markdownContent.nativeElement;
    if (!navigator.clipboard) {
      return;
    }
    // An input change that leaves the rendered HTML identical does not rewrite the DOM, so the
    // existing wrappers and their listeners are still live and must not be built a second time.
    if (container.querySelector('.code-block-wrap')) {
      return;
    }
    this.clearCopyListeners();
    container.querySelectorAll('pre').forEach(codeBlock => {
      const wrapper = this.renderer.createElement('div');
      this.renderer.addClass(wrapper, 'code-block-wrap');
      this.renderer.insertBefore(codeBlock.parentNode, wrapper, codeBlock);
      this.renderer.appendChild(wrapper, codeBlock);

      const button = this.renderer.createElement('button');
      this.renderer.setAttribute(button, 'type', 'button');
      this.renderer.addClass(button, 'copy-btn');
      this.renderer.setProperty(button, 'textContent', $localize`Copy`);
      this.renderer.appendChild(wrapper, button);
      this.copyListeners.push(this.renderer.listen(button, 'click', () => this.copyCode(codeBlock, button)));
    });
  }

  private copyCode(codeBlock: HTMLElement, button: HTMLElement) {
    const code = codeBlock.querySelector('code') || codeBlock;
    navigator.clipboard.writeText(code.textContent || '').then(() => {
      button.classList.add('copied');
      setTimeout(() => button.classList.remove('copied'), 300);
    }, error => console.error('Could not copy text: ', error));
  }

  private clearCopyListeners() {
    this.copyListeners.forEach(unlisten => unlisten());
    this.copyListeners = [];
  }
}
