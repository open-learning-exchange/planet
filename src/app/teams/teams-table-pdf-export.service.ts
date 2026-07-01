import { Injectable } from '@angular/core';
import { PlanetMessageService } from '../shared/planet-message.service';
import { PdfService } from '../shared/pdf.service';
import { markdownToPlainText } from '../shared/utils';

export interface PdfSummaryItem {
  format?: 'currency';
  label: string;
  value: string | number;
}

export interface PdfImage {
  image: string;
  name?: string;
}

export interface PdfImageSection {
  images: PdfImage[];
  title: string;
}

export interface PdfTableExportOptions {
  columnFormatters?: { [key: string]: (value: any, row: any) => string | number };
  currencyCode?: string;
  data: any[];
  filename?: string;
  imageSections?: PdfImageSection[];
  moneyColumns?: string[];
  subtitle?: string;
  summary?: PdfSummaryItem[];
  title: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamsTablePdfExportService {

  constructor(
    private pdfService: PdfService,
    private planetMessageService: PlanetMessageService
  ) {}

  exportTable({
    columnFormatters = {},
    currencyCode,
    data,
    filename,
    imageSections = [],
    moneyColumns = [],
    subtitle,
    summary = [],
    title
  }: PdfTableExportOptions) {
    const formattedData = this.formatRows(data, columnFormatters, moneyColumns, currencyCode);
    if (formattedData.length === 0) {
      this.planetMessageService.showAlert($localize`There was no data during that period to export`);
      return;
    }
    const headers = Object.keys(formattedData[0]);
    const documentDefinition = {
      pageOrientation: headers.length > 5 ? 'landscape' : 'portrait',
      pageMargins: [ 32, 36, 32, 36 ],
      content: [
        { text: title, style: 'title' },
        subtitle ? { text: subtitle, style: 'subtitle' } : '',
        ...this.summaryContent(summary, currencyCode),
        {
          table: {
            headerRows: 1,
            widths: this.tableWidths(headers),
            body: [
              headers.map(header => ({ text: this.headerLabel(header), style: 'tableHeader' })),
              ...formattedData.map(row => headers.map(header => ({
                text: row[header],
                style: 'tableCell',
                alignment: this.cellAlignment(header)
              })))
            ]
          },
          layout: 'lightHorizontalLines'
        },
        ...this.imagesContent(imageSections)
      ].filter(Boolean),
      styles: {
        title: { fontSize: 16, bold: true, margin: [ 0, 0, 0, 6 ] },
        subtitle: { fontSize: 10, color: '#555555', margin: [ 0, 0, 0, 12 ] },
        imageSectionTitle: { fontSize: 11, bold: true, margin: [ 0, 10, 0, 6 ] },
        imageCaption: { fontSize: 8, color: '#555555', margin: [ 0, 3, 0, 8 ] },
        summaryLabel: { bold: true, color: '#333333' },
        summaryValue: { alignment: 'right' },
        tableHeader: { bold: true, fillColor: '#eeeeee', fontSize: 9 },
        tableCell: { fontSize: 8 }
      },
      defaultStyle: {
        fontSize: 9
      }
    };
    this.pdfService.download(documentDefinition, filename || `${title}.pdf`);
  }

  private tableWidths(headers: string[]) {
    if (headers.length > 5) {
      return headers.map(() => '*');
    }
    return headers.map(header => this.isFlexibleColumn(header) ? '*' : 'auto');
  }

  private isFlexibleColumn(header: string) {
    return [ 'description', 'note', 'summary' ].includes(header.toLowerCase());
  }

  private headerLabel(header: string) {
    return header.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
  }

  private cellAlignment(header: string) {
    const numericHeaders = [
      'amount', 'balance', 'beginning balance', 'credit', 'debit', 'ending balance',
      'other expenses', 'other income', 'profit/loss', 'sales', 'wages'
    ];
    return numericHeaders.includes(header.toLowerCase()) ? 'right' : 'left';
  }

  private formatRows(
    data: any[],
    columnFormatters: PdfTableExportOptions['columnFormatters'] = {},
    moneyColumns: string[] = [],
    currencyCode?: string
  ) {
    return data.map(row => {
      return Object.entries(row).reduce(
        (object, [ key, value ]: [ string, any ]) => {
          const formattedKey = markdownToPlainText(key);
          const formatter = columnFormatters[formattedKey];
          const formattedValue = moneyColumns.includes(formattedKey) ?
            this.formatCurrency(value, currencyCode) :
            formatter ? formatter(value, row) : value;
          return { ...object, [formattedKey]: this.formatValue(formattedValue) };
        },
        {}
      );
    });
  }

  private formatValue(value: any) {
    if (value === undefined || value === null) {
      return '';
    }
    return markdownToPlainText(value);
  }

  private summaryContent(summary: PdfSummaryItem[], currencyCode?: string) {
    if (summary.length === 0) {
      return [];
    }
    return [
      {
        table: {
          widths: [ '*', 'auto' ],
          body: summary.map(item => [
            { text: item.label, style: 'summaryLabel' },
            {
              text: this.formatValue(item.format === 'currency' ? this.formatCurrency(item.value, currencyCode) : item.value),
              style: 'summaryValue'
            }
          ])
        },
        layout: 'noBorders',
        margin: [ 0, 0, 0, 12 ]
      }
    ];
  }

  private formatCurrency(value: any, currencyCode = 'USD') {
    const amount = Number(value) || 0;
    const format = (currency: string) => new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol'
    }).format(amount);
    try {
      return format(currencyCode || 'USD');
    } catch (e) {
      try {
        return format('USD');
      } catch (fallbackError) {
        return amount.toString();
      }
    }
  }

  private imagesContent(sections: PdfImageSection[]) {
    return sections
      .filter(section => section.images.length > 0)
      .flatMap(section => [
        { text: section.title, style: 'imageSectionTitle' },
        ...this.imageRows(section.images)
      ]);
  }

  private imageRows(images: PdfImage[]) {
    const rows = [];
    for (let index = 0; index < images.length; index += 2) {
      rows.push({
        columns: images.slice(index, index + 2).map(image => ({
          width: '*',
          stack: [
            { image: image.image, fit: [ 250, 250 ] },
            image.name ? { text: image.name, style: 'imageCaption' } : ''
          ].filter(Boolean)
        })),
        columnGap: 12,
        margin: [ 0, 0, 0, 8 ]
      });
    }
    return rows;
  }

}
