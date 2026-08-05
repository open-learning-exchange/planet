import pdfMake from 'pdfmake/build/pdfmake';
import { vi } from 'vitest';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;
  let download: ReturnType<typeof vi.fn>;
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    planetMessageService = { showAlert: vi.fn() };
    service = new PdfService(planetMessageService as any);
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

  it('shows an alert when the export fails', async () => {
    vi.mocked(pdfMake.createPdf).mockImplementation(() => {
      throw new Error('export failed');
    });

    await service.download({ content: [] }, 'custom.pdf');

    expect(planetMessageService.showAlert).toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });
});
