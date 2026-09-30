import {
  formatResourceAttachmentSize, formatResourceAttachmentsSize, resourceAttachmentFilename, resourceFileType
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

  it.each([
    [ 'no attachment', {}, undefined ],
    [ 'the stored content type', { _attachments: { lesson: { content_type: 'application/pdf' } } }, 'pdf' ],
    [ 'the extension for a generic type', { _attachments: { 'Story.EPUB': { content_type: 'application/octet-stream' } } }, 'document' ],
    [ 'the extension for a nonstandard type', { _attachments: { 'a.docx': { content_type: 'application/wps-office.docx' } } }, 'document' ],
    [ 'the extension when no type is stored', { _attachments: { 'clip.mp4': {} } }, 'video' ],
    [ 'audio families', { _attachments: { 'song.opus': { content_type: 'audio/ogg; codecs=opus' } } }, 'audio' ],
    [ 'images including svg', { _attachments: { 'map.svg': { content_type: 'image/svg+xml' } } }, 'image' ],
    [ 'csv as a spreadsheet', { _attachments: { 'scores.csv': { content_type: 'text/csv' } } }, 'spreadsheet' ],
    [ 'csv type aliases', { _attachments: { 'scores.csv': { content_type: 'text/comma-separated-values' } } }, 'spreadsheet' ],
    [ 'csv types without an extension', { _attachments: { scores: { content_type: 'application/csv' } } }, 'spreadsheet' ],
    [ 'office slides', { _attachments: { 'talk.pptx': {} } }, 'slides' ],
    [ 'office documents', { _attachments: { 'essay.docx': {} } }, 'document' ],
    [ 'plain text and markdown', { _attachments: { 'notes.md': { content_type: 'text/markdown' } } }, 'text' ],
    [ 'archives', { _attachments: { 'data.tar.gz': {} } }, 'archive' ],
    [ 'xz archives', { _attachments: { 'logs.tar.xz': {} } }, 'archive' ],
    [ 'unknown types', { _attachments: { 'app.apk': { content_type: 'application/vnd.android.package-archive' } } }, 'other' ],
    [ 'unzipped bundles', { _attachments: { 'index.html': {}, 'style.css': {} } }, 'html' ],
    [ 'the start file of a bundle', { openWhichFile: 'week1.pdf', _attachments: { 'week1.pdf': {}, 'week2.pdf': {} } }, 'pdf' ]
  ])('classifies the file type from %s', (_, doc, fileType) => {
    expect(resourceFileType(doc)?.value).toBe(fileType);
  });

});
