import {
  formatResourceAttachmentSize, formatResourceAttachmentsSize, resourceAttachmentFilename
} from './resources.utils';

describe('resource attachment utilities', () => {

  it('returns an empty string for resources without attachments', () => {
    expect(formatResourceAttachmentSize(null)).toBe('');
    expect(formatResourceAttachmentSize({})).toBe('');
    expect(formatResourceAttachmentsSize({ _attachments: {} })).toBe('');
    expect(formatResourceAttachmentSize({ _attachments: { 'unknown.bin': {} } })).toBe('');
    expect(formatResourceAttachmentsSize({ _attachments: { 'unknown.bin': {} } })).toBe('');
  });

  it('formats an explicit zero-length attachment as 0 B', () => {
    const emptyDoc = { _attachments: { 'empty.txt': { length: 0 } } };
    expect(formatResourceAttachmentSize(emptyDoc)).toBe('0 B');
    expect(formatResourceAttachmentsSize(emptyDoc)).toBe('0 B');
  });

  it('formats a single attachment', () => {
    const singleDoc = {
      _attachments: {
        'report.pdf': { length: 2516582, content_type: 'application/pdf' }
      }
    };
    expect(formatResourceAttachmentSize(singleDoc)).toBe('2.4 MB');
  });

  it('formats the selected attachment separately from a composite bundle total', () => {
    const multiDoc = {
      openWhichFile: 'index.html',
      _attachments: {
        'index.html': { length: 50000 },
        'bundle.js': { length: 200000 },
        'style.css': { length: 50000 }
      }
    };
    expect(formatResourceAttachmentSize(multiDoc)).toBe('48.8 KB');
    expect(formatResourceAttachmentSize(multiDoc, 'bundle.js')).toBe('195.3 KB');
    expect(formatResourceAttachmentsSize(multiDoc)).toBe('293 KB');
  });

  it('uses the first attachment when the preferred filename is empty or missing', () => {
    const attachments = {
      'index.html': { length: 50000 },
      'style.css': { length: 10000 }
    };
    expect(resourceAttachmentFilename({ openWhichFile: '', _attachments: attachments })).toBe('index.html');
    expect(resourceAttachmentFilename({ openWhichFile: 'missing.html', _attachments: attachments })).toBe('index.html');
    expect(formatResourceAttachmentSize({ openWhichFile: '', _attachments: attachments })).toBe('48.8 KB');
  });

});
