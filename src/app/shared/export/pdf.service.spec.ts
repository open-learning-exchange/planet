import { TestBed } from '@angular/core/testing';
import pdfMake from 'pdfmake/build/pdfmake';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MarkdownRenderService } from '@shared/markdown/markdown-render.service';
import { PdfService } from './pdf.service';

const createdDefinition = () => vi.mocked(pdfMake.createPdf).mock.calls[0][0] as any;

const textOf = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(textOf).join('') :
  [ node.text, node.stack, node.ul ].filter(Boolean).map(textOf).join('');

describe('PdfService', () => {
  let service: PdfService;
  let download: ReturnType<typeof vi.fn>;
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };
  let couchService: { getAttachment: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    planetMessageService = { showAlert: vi.fn() };
    couchService = { getAttachment: vi.fn() };
    service = new PdfService(planetMessageService as any, couchService as any, TestBed.inject(MarkdownRenderService));
    download = vi.fn();
    vi.spyOn(pdfMake, 'createPdf').mockReturnValue({ download } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads a custom document definition', async () => {
    const documentDefinition = { content: [ { text: 'Custom PDF' } ] };

    await service.download(documentDefinition, 'custom.pdf');

    expect(pdfMake.createPdf).toHaveBeenCalledWith(documentDefinition);
    expect(download).toHaveBeenCalledWith('custom.pdf');
  });

  it('embeds each linked image once and leaves out one that fails to load', async () => {
    const loaded = 'http://couch/resources/a/diagram.png';
    const missing = 'http://couch/resources/b/gone.png';
    couchService.getAttachment.mockImplementation((url: string) =>
      url === loaded ? of(new Blob([ 'png' ], { type: 'image/png' })) : throwError(new Error('not found'))
    );

    await service.download({ content: [ { stack: [ { image: loaded }, { image: loaded } ] }, { image: missing } ] }, 'images.pdf');

    const definition = createdDefinition();
    expect(couchService.getAttachment).toHaveBeenCalledTimes(2);
    expect(definition.images[loaded]).toMatch(/^data:image\/png;base64,/);
    expect(definition.content[0].stack[0]).toEqual({ image: loaded });
    expect(definition.content[1]).toEqual({ text: '' });
  });

  it('turns a markdown node into formatted content and keeps its own style', async () => {
    await service.download({ content: [ { markdown: 'Take **two** tablets', style: 'content' } ] }, 'markdown.pdf');

    const definition = createdDefinition();
    const node = definition.content[0];
    expect(node.markdown).toBeUndefined();
    expect(node.style).toBe('content');
    expect(JSON.stringify(node.stack)).toContain('"bold":true');
    expect(definition.styles['markdown-align-right']).toEqual({ alignment: 'right' });
  });

  it('prints markdown text the way the screen shows it', async () => {
    const markdown = 'Take one tablet\nwith food\n\n- **Paracetamol** *500mg*\n- [x] Rest\n- [ ] Fluids\n\n```\nline 1\nline 2\n```';

    await service.download({ content: [ { markdown } ] }, 'markdown.pdf');

    const stack = createdDefinition().content[0].stack;
    const text = textOf(stack);
    expect(text).toContain('Take one tablet with food');
    expect(text).toContain('Paracetamol 500mg');
    expect(text).toContain('[x] Rest');
    expect(text).toContain('[ ] Fluids');
    expect(text).toContain('line 1\nline 2');
    expect(stack.filter(child => typeof child.text === 'string' && !child.text.trim())).toEqual([]);
  });

  it('leaves out an image whose URL the renderer removed', async () => {
    await service.download({ content: [ { markdown: 'See ![photo](file:///C:/photo.png)' } ] }, 'markdown.pdf');

    const stack = JSON.stringify(createdDefinition().content[0].stack);
    expect(stack).toContain('See');
    expect(stack).not.toContain('"image"');
  });

  it('embeds an image uploaded into markdown and fits every markdown image to the page', async () => {
    couchService.getAttachment.mockReturnValue(of(new Blob([ 'png' ], { type: 'image/png' })));
    const markdown = '![diagram](resources/a/diagram.png)\n\n![pasted](data:image/png;base64,iVBORw0KGgo=)';

    await service.download({ content: [ { markdown } ] }, 'markdown.pdf');

    const definition = createdDefinition();
    const [ url ] = couchService.getAttachment.mock.calls[0];
    expect(couchService.getAttachment).toHaveBeenCalledTimes(1);
    expect(url).toMatch(/^https?:\/\/.+\/resources\/a\/diagram\.png$/);
    expect(definition.images[url]).toMatch(/^data:image\/png;base64,/);
    expect(JSON.stringify(definition.content[0].stack).match(/"fit":\[400,400\]/g)).toHaveLength(2);
  });

  it('sanitizes an html node before converting it', async () => {
    await service.download({ content: [ { html: '<p>Hello</p><script>alert(1)</script>' } ] }, 'html.pdf');

    const stack = JSON.stringify(createdDefinition().content[0].stack);
    expect(stack).toContain('Hello');
    expect(stack).not.toContain('alert');
  });

  it('shows an alert when the export fails', async () => {
    vi.mocked(pdfMake.createPdf).mockImplementation(() => {
      throw new Error('export failed');
    });

    await service.download({ content: [] }, 'custom.pdf');

    expect(planetMessageService.showAlert).toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });
});
