import { ResourcesSearchComponent } from './resources-search.component';
import { getResourceFileType } from '../resources-constants';
import { filterAdvancedSearch } from '../../shared/table-helpers';

describe('ResourcesSearchComponent and getResourceFileType', () => {
  let component: ResourcesSearchComponent;

  beforeEach(() => {
    component = new ResourcesSearchComponent();
  });

  describe('getResourceFileType edgecases', () => {
    it('prioritizes exact file extension from attachments or filename over generic mediaType', () => {
      expect(getResourceFileType({ filename: 'video.mp4', mediaType: 'video' })).toBe('mp4');
      expect(getResourceFileType({ _attachments: { 'audio.mp3': {} }, mediaType: 'audio' })).toBe('mp3');
    });

    it('handles uppercase file extensions cleanly', () => {
      expect(getResourceFileType({ filename: 'DOCUMENT.PDF', mediaType: 'pdf' })).toBe('pdf');
      expect(getResourceFileType({ _attachments: { 'PHOTO.PNG': {} } })).toBe('png');
    });

    it('uses openWhichFile over first attachment key when present', () => {
      expect(getResourceFileType({
        openWhichFile: 'main.html',
        _attachments: { 'data.json': {}, 'main.html': {} }
      })).toBe('html');
    });

    it('falls back to mediaType if filename or attachments have no extension', () => {
      expect(getResourceFileType({ filename: 'README', mediaType: 'text' })).toBe('text');
      expect(getResourceFileType({ mediaType: 'pdf' })).toBe('pdf');
    });

    it('returns empty string if no file info available', () => {
      expect(getResourceFileType({})).toBe('');
      expect(getResourceFileType(null)).toBe('');
    });
  });

  describe('createSearchList', () => {
    it('creates search list for mediaType category with extension labels', () => {
      const sampleData = [
        { doc: { filename: 'file1.mp4', mediaType: 'video' } },
        { doc: { filename: 'file2.mp3', mediaType: 'audio' } },
        { doc: { _attachments: { 'archive.zip': {} } } }
      ];

      const category = component.categories.find(c => c.label === 'mediaType');
      const searchList = component.createSearchList(category, sampleData);

      expect(searchList.category).toBe('mediaType');
      expect(searchList.items).toEqual([
        { label: 'MP3', value: 'mp3' },
        { label: 'MP4', value: 'mp4' },
        { label: 'ZIP', value: 'zip' }
      ]);
    });
  });

  describe('filterAdvancedSearch integration with mediaType', () => {
    const docMp4 = { doc: { filename: 'clip.mp4', mediaType: 'video' } };
    const docPdf = { doc: { filename: 'doc.pdf', mediaType: 'pdf' } };
    const docZip = { doc: { _attachments: { 'app.zip': {} } } };

    it('matches rows when single file type selected', () => {
      const filterFn = filterAdvancedSearch({ mediaType: ['mp4'] });
      expect(filterFn(docMp4, '')).toBe(true);
      expect(filterFn(docPdf, '')).toBe(false);
      expect(filterFn(docZip, '')).toBe(false);
    });

    it('matches rows when multiple file types selected (OR matching)', () => {
      const filterFn = filterAdvancedSearch({ mediaType: ['mp4', 'zip'] });
      expect(filterFn(docMp4, '')).toBe(true);
      expect(filterFn(docPdf, '')).toBe(false);
      expect(filterFn(docZip, '')).toBe(true);
    });

    it('matches all rows when no file types selected', () => {
      const filterFn = filterAdvancedSearch({ mediaType: [] });
      expect(filterFn(docMp4, '')).toBe(true);
      expect(filterFn(docPdf, '')).toBe(true);
      expect(filterFn(docZip, '')).toBe(true);
    });
  });
});
