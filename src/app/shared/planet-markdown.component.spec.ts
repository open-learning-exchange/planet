import { TestBed } from '@angular/core/testing';
import { PlanetMarkdownComponent } from './planet-markdown.component';
import { StateService } from './state.service';
import { MarkdownRenderService } from './markdown-render.service';

// The Markdown-to-DOM corpus lives in markdown-render.service.spec.ts; these cover what the
// component adds on top of it.
describe('PlanetMarkdownComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ PlanetMarkdownComponent ],
      providers: [
        {
          provide: StateService,
          useValue: { configuration: { parentDomain: 'parent.example' } }
        }
      ]
    }).compileComponents();
  });

  const render = (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    Object.entries(inputs).forEach(([ name, value ]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    return fixture;
  };

  it('renders through the shared renderer', () => {
    const fixture = render({ content: '![x](bad"onerror="alert(1))\n\n[y](javascript:alert(2))' });
    const rendered = fixture.nativeElement.querySelector('.markdown-content') as HTMLElement;

    expect(rendered.querySelector('[onerror]')).toBeFalsy();
    expect(rendered.querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('renders task lists with inert checkbox markers', () => {
    const fixture = render({ content: '- [ ] todo\n- [x] done', previewMode: true });
    const checkboxes = fixture.nativeElement.querySelectorAll('[role="checkbox"]') as NodeListOf<HTMLElement>;

    expect(fixture.nativeElement.querySelector('.markdown-content')).toBeTruthy();
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].getAttribute('aria-disabled')).toBe('true');
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    expect(checkboxes[0].textContent).toBe('☐');
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');
    expect(checkboxes[1].textContent).toBe('☑');
  });

  it('retains indented code when trimming excessive trailing whitespace', () => {
    const fixture = render({ content: `Intro\n\n    const value = 1;${' '.repeat(12)}\n    return value;` });

    expect(fixture.nativeElement.classList).toContain('planet-markdown-renderer');
    expect(fixture.nativeElement.querySelector('pre code')?.textContent).toContain('const value = 1;\nreturn value;');
  });

  it('renders strikethroughs and hard line breaks', () => {
    const fixture = render({ content: '~~deleted~~\n\nFirst   \nSecond' });

    expect(fixture.nativeElement.querySelector('del')?.textContent).toBe('deleted');
    expect(fixture.nativeElement.querySelector('br')).toBeTruthy();
  });

  it('renders pasted tables with pathological leading indentation', () => {
    const fixture = render({
      content: '          | Name | Value |\n          | --- | ---: |\n          | Alpha | 1 |'
    });

    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('pre')).toBeFalsy();
    // The paired `.markdown-align-right` rule lives in planet-markdown.scss. The runner does not
    // apply component stylesheets, so the computed alignment is not assertable here.
    expect(fixture.nativeElement.querySelector('td.markdown-align-right')).toBeTruthy();
  });

  it('preserves standard nested lists, tables, code blocks, and links', () => {
    const fixture = render({ content: `- Table in a list:
  | Name | Value |
  | --- | --- |
  | Alpha | 1 |

1. First item
    - Nested item

\`\`\`ts
const config = {
    nested: true
};
\`\`\`

[Duck Duck Go](https://duckduckgo.com)` });

    const link = fixture.nativeElement.querySelector('.markdown-content a') as HTMLAnchorElement;

    expect(fixture.nativeElement.querySelector('ul > li > table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ol > li > ul > li')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('pre code')?.textContent).toContain('    nested: true');
    expect(link.textContent).toBe('Duck Duck Go');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('slugs heading ids and fragment links to match each other', () => {
    const fixture = render({ content: '# My Heading\n\n[jump](#my-heading)' });
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;

    expect(heading.id).toBe('myheading');
    expect(fixture.nativeElement.querySelector('.markdown-content a')?.getAttribute('href')).toBe(`#${heading.id}`);
  });

  it('does not rebuild code-block controls when an unrelated input changes', () => {
    // The runner has no clipboard API, and the copy button is only built when one exists.
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn() }, configurable: true });

    try {
      const fixture = render({ content: '```ts\nconst a = 1;\n```', profile: 'chat' });

      expect(fixture.nativeElement.querySelectorAll('.copy-btn').length).toBe(1);

      fixture.componentRef.setInput('limit', 200);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.code-block-wrap').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.copy-btn').length).toBe(1);
    } finally {
      if (clipboard) {
        Object.defineProperty(navigator, 'clipboard', clipboard);
      } else {
        delete (navigator as any).clipboard;
      }
    }
  });

  it('passes the chat profile through to the renderer', () => {
    const chat = render({ content: 'one\ntwo', profile: 'chat' });
    const standard = render({ content: 'one\ntwo' });

    expect(chat.nativeElement.querySelector('br')).toBeTruthy();
    expect(standard.nativeElement.querySelector('br')).toBeFalsy();
  });

  it('does not overwrite or progressively sanitize the content input', () => {
    const content = '[unsafe](javascript:alert(1))';
    const fixture = render({ content });

    fixture.componentRef.setInput('imageSource', 'parent');
    fixture.detectChanges();

    expect(fixture.componentInstance.content).toBe(content);
    expect(fixture.nativeElement.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(fixture.nativeElement.querySelector('a')?.textContent).toBe('unsafe');
  });

  it('resolves hosted images before sanitizing the rendered HTML', () => {
    const fixture = render({ content: '![Map](/resources/map/image.png)', imageSource: 'parent' });
    const image = fixture.nativeElement.querySelector('.markdown-content img') as HTMLImageElement;

    expect(image.src).toBe('https://parent.example/resources/map/image.png');
    expect(TestBed.inject(MarkdownRenderService).resolveHostedUrl('/resources/map/image.png', 'https://planet.example/db/'))
      .toBe('https://planet.example/db/resources/map/image.png');
  });

  it('keeps preview images in the hosted gallery rather than the truncated text', () => {
    const fixture = render({
      content: 'Summary\n\n![Map](resources/map/image.png)',
      imageSource: 'parent',
      previewMode: true
    });

    expect(fixture.nativeElement.querySelector('.markdown-content img')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.image-gallery img')?.src)
      .toBe('https://parent.example/resources/map/image.png');
  });
});
