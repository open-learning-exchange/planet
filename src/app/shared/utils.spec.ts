import { vi } from 'vitest';
import {
  couchAttachmentPath, couchAttachmentUrl, formatBytes, normalizeImage, scaledDimensions
} from './utils';

describe('utils', () => {

  describe('CouchDB attachment URLs', () => {

    it('encodes document IDs and individual attachment path segments', () => {
      expect(couchAttachmentPath('doc/with?chars', 'site/assets/main #1%.css')).toBe(
        'doc%2Fwith%3Fchars/site/assets/main%20%231%25.css'
      );
      expect(couchAttachmentUrl('http://localhost:2200/', '/resources/', 'doc/id', 'site/index.html')).toBe(
        'http://localhost:2200/resources/doc%2Fid/site/index.html'
      );
    });

  });

  describe('scaledDimensions', () => {

    it('bounds dimensions without upscaling', () => {
      expect(scaledDimensions(1200, 900, 600)).toEqual({ width: 600, height: 450 });
      expect(scaledDimensions(300, 200, 600)).toEqual({ width: 300, height: 200 });
    });

  });

  describe('normalizeImage', () => {
    const originalImage = window.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    class ErrorImage {
      onload: () => void = () => {};
      onerror: () => void = () => {};

      set src(_value: string) {
        setTimeout(() => this.onerror());
      }
    }

    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:cover');
      URL.revokeObjectURL = vi.fn();
      (window as any).Image = ErrorImage;
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      (window as any).Image = originalImage;
      vi.restoreAllMocks();
    });

    it('returns the original file when image loading fails', async () => {
      const file = new File([ 'not really image' ], 'bad.png', { type: 'image/png' });

      const result = await normalizeImage(file);

      expect(result.file).toBe(file);
      expect(result.fileName).toBe('bad.png');
      expect(result.contentType).toBe('image/png');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover');
    });

    it('avoids existing attachment names when falling back to the original file', async () => {
      const file = new File([ 'not really image' ], 'cover.png', { type: 'image/png' });

      const result = await normalizeImage(file, { usedNames: [ 'cover.png' ] });

      expect(result.fileName).toBe('cover-1.png');
    });

  });

  describe('formatBytes', () => {

    it('returns empty string for invalid, missing, or zero bytes', () => {
      expect(formatBytes(undefined)).toBe('');
      expect(formatBytes(null as any)).toBe('');
      expect(formatBytes(0)).toBe('');
      expect(formatBytes(-100)).toBe('');
      expect(formatBytes(NaN)).toBe('');
    });

    it('formats bytes, kilobytes, megabytes, and gigabytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(0.5)).toBe('0.5 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(2516582)).toBe('2.4 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1048575)).toBe('1 MB');
    });

  });

});
