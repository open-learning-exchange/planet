import { vi } from 'vitest';
import { PlanetMessageService } from '../shared/planet-message.service';
import { PdfService } from '../shared/pdf.service';
import { TeamsTablePdfExportService } from './teams-table-pdf-export.service';

describe('TeamsTablePdfExportService', () => {
  let service: TeamsTablePdfExportService;
  let messageService: { showAlert: ReturnType<typeof vi.fn> };
  let pdfService: { download: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    messageService = { showAlert: vi.fn() };
    pdfService = { download: vi.fn() };
    service = new TeamsTablePdfExportService(
      pdfService as any as PdfService,
      messageService as any as PlanetMessageService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an alert when there is no data to export', () => {
    service.exportTable({ data: [], title: 'Empty report' });

    expect(messageService.showAlert).toHaveBeenCalled();
    expect(pdfService.download).not.toHaveBeenCalled();
  });

  it('builds PDF table headers and rows from data keys', () => {
    service.exportTable({
      data: [ { description: 'Alice', amount: 12 } ],
      title: 'Test report',
      currencyCode: 'USD',
      currencySymbol: '¤',
      flexibleColumns: [ 'description' ],
      moneyColumns: [ 'amount' ],
      summary: [ { label: 'Total', value: 12, format: 'currency' } ]
    });

    const documentDefinition = pdfService.download.mock.calls[0][0] as any;
    const summaryBody = documentDefinition.content[1].table.body;
    const tableBody = documentDefinition.content[2].table.body;

    expect(summaryBody[0]).toEqual([
      { text: 'Total', style: 'summaryLabel' },
      { text: '¤12.00', style: 'summaryValue' }
    ]);

    expect(tableBody[0]).toEqual([
      { text: 'Description', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader' }
    ]);
    expect(tableBody[1]).toEqual([
      { text: 'Alice', style: 'tableCell', alignment: 'left' },
      { text: '¤12.00', style: 'tableCell', alignment: 'right' }
    ]);
    expect(documentDefinition.content[2].table.widths).toEqual([ '*', 'auto' ]);
    expect(pdfService.download).toHaveBeenCalledWith(documentDefinition, 'Test report.pdf');
  });

  it('adds image sections after the table', () => {
    service.exportTable({
      data: [ { Name: 'Alice' } ],
      imageSections: [
        { title: '**Receipts**', images: [ { image: 'data:image/png;base64,test', name: 'receipt.png' } ] }
      ],
      title: 'Report with images'
    });

    const documentDefinition = pdfService.download.mock.calls[0][0] as any;

    expect(documentDefinition.content[2]).toEqual({ text: 'Receipts', style: 'imageSectionTitle' });
    expect(documentDefinition.content[3].columns[0].stack).toEqual([
      { image: 'data:image/png;base64,test', fit: [ 250, 250 ] },
      { text: 'receipt.png', style: 'imageCaption' }
    ]);
  });
});
