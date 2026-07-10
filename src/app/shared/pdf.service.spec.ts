import pdfMake from 'pdfmake/build/pdfmake';
import { vi } from 'vitest';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;
  let download: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new PdfService();
    download = vi.fn();
    vi.spyOn(pdfMake, 'createPdf').mockReturnValue({ download } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads a custom document definition', () => {
    const documentDefinition = { content: [ { text: 'Custom PDF' } ] };

    service.download(documentDefinition, 'custom.pdf');

    expect(pdfMake.createPdf).toHaveBeenCalledWith(documentDefinition);
    expect(download).toHaveBeenCalledWith('custom.pdf');
  });
});
