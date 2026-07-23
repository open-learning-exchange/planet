import { TestBed } from '@angular/core/testing';
import { PlanetMarkdownComponent } from './planet-markdown.component';
import { StateService } from './state.service';

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

  it('renders task lists with the lightweight markdown component', () => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    fixture.componentRef.setInput('content', '- [ ] todo\n- [x] done');
    fixture.componentRef.setInput('previewMode', true);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

    expect(fixture.nativeElement.querySelector('td-markdown')).toBeTruthy();
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].disabled).toBe(true);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].disabled).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
  });

  it('retains indented code when trimming excessive trailing whitespace', () => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    fixture.componentRef.setInput('content', `Intro\n\n    const value = 1;${' '.repeat(12)}\n    return value;`);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('planet-markdown-renderer');
    expect(fixture.nativeElement.querySelector('pre code')?.textContent).toContain('const value = 1;\nreturn value;');
  });

  it('renders strikethroughs and hard line breaks', () => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    fixture.componentRef.setInput('content', '~~deleted~~\n\nFirst   \nSecond');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('del')?.textContent).toBe('deleted');
    expect(fixture.nativeElement.querySelector('br')).toBeTruthy();
  });

  it('renders pasted tables with pathological leading indentation', () => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    fixture.componentRef.setInput(
      'content',
      '          | Name | Value |\n          | --- | ---: |\n          | Alpha | 1 |'
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('pre')).toBeFalsy();
  });

  it('preserves standard nested lists, tables, code blocks, and links', () => {
    const fixture = TestBed.createComponent(PlanetMarkdownComponent);
    fixture.componentRef.setInput('content', `- Table in a list:
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

[Duck Duck Go](https://duckduckgo.com)`);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('td-markdown a') as HTMLAnchorElement;

    expect(fixture.nativeElement.querySelector('ul > li > table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ol > li > ul > li')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('pre code')?.textContent).toContain('    nested: true');
    expect(link.textContent).toBe('Duck Duck Go');
    expect(link.target).toBe('_blank');
  });
});
