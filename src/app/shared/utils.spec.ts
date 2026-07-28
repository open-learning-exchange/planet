import { vi } from 'vitest';
import { couchAttachmentPath, couchAttachmentUrl, normalizeImage, scaledDimensions } from './utils';

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

});
