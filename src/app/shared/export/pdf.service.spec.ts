import pdfMake from 'pdfmake/build/pdfmake';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;
  let download: ReturnType<typeof vi.fn>;
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };
  let couchService: { getAttachment: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    planetMessageService = { showAlert: vi.fn() };
    couchService = { getAttachment: vi.fn() };
    service = new PdfService(planetMessageService as any, couchService as any);
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

    const definition = vi.mocked(pdfMake.createPdf).mock.calls[0][0] as any;
    expect(couchService.getAttachment).toHaveBeenCalledTimes(2);
    expect(definition.images[loaded]).toMatch(/^data:image\/png;base64,/);
    expect(definition.content[0].stack[0]).toEqual({ image: loaded, fit: [ 400, 400 ] });
    expect(definition.content[1]).toEqual({ text: '' });
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
