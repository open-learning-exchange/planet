import { vi } from 'vitest';
import {
  doesMarkdownPreviewTruncate, hasMarkdownImages, normalizeImage, normalizeMarkdownWhitespace, scaledDimensions
} from './utils';

describe('utils', () => {

  describe('normalizeMarkdownWhitespace', () => {

    it('preserves meaningful indentation and hard line breaks', () => {
      const markdown = '\n1. First\n    - Nested\n\n\n\n```\n    code\n```\nHard break  \nNext\n';

      expect(normalizeMarkdownWhitespace(markdown)).toBe(
        '1. First\n    - Nested\n\n```\n    code\n```\nHard break  \nNext'
      );
    });

    it('preserves hard breaks with more than two trailing spaces', () => {
      expect(normalizeMarkdownWhitespace('First   \nSecond')).toBe('First   \nSecond');
    });

    it('preserves inline-code whitespace and deep list indentation', () => {
      const markdown = [
        'Use `a    b` as written.',
        '            - Fourth-level item',
        '>     blockquote code'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('separates a table placed directly below a list item', () => {
      const markdown = '- Table in a list:\n  | Name | Value |\n  | --- | ---: |\n  | Alpha | 1 |';

      expect(normalizeMarkdownWhitespace(markdown)).toBe(
        '- Table in a list:\n\n  | Name | Value |\n  | --- | ---: |\n  | Alpha | 1 |'
      );
    });

    it('does not normalize table-shaped content inside fenced code blocks', () => {
      const markdown = [
        '```',
        '- Not a list',
        '| Name | Value |',
        '| --- | --- |',
        '```',
        '',
        '~~~md',
        '- Still code',
        '| A | B |',
        '| --- | --- |',
        '~~~'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('does not normalize table-shaped content inside fences nested under list items', () => {
      const markdown = [
        '1. Parent',
        '    - Nested',
        '      ```',
        '      - Not a list',
        '      | Name | Value |',
        '      | --- | --- |',
        '      ```'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('preserves blank lines around a fence nested under a list item', () => {
      const markdown = [
        '- Item',
        '',
        '  ```',
        '  const aligned = "a    b";',
        '  ```',
        '',
        'After the list'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('normalizes CRLF before detecting tables and fenced content', () => {
      const markdown = [
        '- Table in a list:',
        '  | Name | Value |',
        '  | --- | --- |',
        '',
        '```',
        'const aligned = "a    b";',
        '```',
        `${' '.repeat(20)}After the fence`
      ].join('\r\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe([
        '- Table in a list:',
        '',
        '  | Name | Value |',
        '  | --- | --- |',
        '',
        '```',
        'const aligned = "a    b";',
        '```',
        'After the fence'
      ].join('\n'));
    });

    it('preserves fences inside blockquote and list containers', () => {
      const markdown = [
        '> ```',
        '> const quoted = "a    b";',
        '> ```',
        '',
        '- ```',
        '  const listed = "a    b";',
        '  ```'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('strips accidental leading whitespace so prose does not render as code (#9725)', () => {
      const markdown = '                                   MI BELLA GUATEMALA\n\t\t\t\t\t\t \nMi bella guatemala hoy cumples 204 años';

      expect(normalizeMarkdownWhitespace(markdown)).toBe(
        'MI BELLA GUATEMALA\n\nMi bella guatemala hoy cumples 204 años'
      );
    });

    it('collapses interior whitespace runs and excess blank lines (#9725)', () => {
      const markdown = ' monja blanca' + ' '.repeat(300) + 'Mariposa rara\n \n\t\t\t\t\t \n\t\t\t\t\t \n\t\t\t\t\t ';

      expect(normalizeMarkdownWhitespace(markdown)).toBe(' monja blanca  Mariposa rara');
    });

    it('cleans pasted prose with excessive leading and trailing tabs (#9725)', () => {
      const markdown = `${' '.repeat(36)}MI BELLA PATRIA
${'\t'.repeat(18)}
\t\tGuatemala pais de muchas culturas${'\t'.repeat(18)}`;

      expect(normalizeMarkdownWhitespace(markdown)).toBe(
        'MI BELLA PATRIA\n\nGuatemala pais de muchas culturas'
      );
    });

    it('preserves paired indented fences and their content', () => {
      const markdown = [
        '    ```',
        '    verbatim inside the fence',
        '    ```'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe(markdown);
    });

    it('does not open a fence from an unmatched indented code line', () => {
      const markdown = [
        '    ```',
        '    unmatched fence in indented code',
        '',
        '- Table after the code:',
        '  | Name | Value |',
        '  | --- | --- |'
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe([
        '    ```',
        '    unmatched fence in indented code',
        '',
        '- Table after the code:',
        '',
        '  | Name | Value |',
        '  | --- | --- |'
      ].join('\n'));
    });

    it('normalizes content after unclosed and same-line fence lookalikes', () => {
      const markdown = [
        '```',
        `${' '.repeat(20)}prose after an unclosed fence`,
        '```inline```',
        `${' '.repeat(20)}prose after an inline span`
      ].join('\n');

      expect(normalizeMarkdownWhitespace(markdown)).toBe([
        '```',
        'prose after an unclosed fence',
        '```inline```',
        'prose after an inline span'
      ].join('\n'));
    });

    it('trims excessive line endings without removing indented code', () => {
      const markdown = `    const value = 1;${' '.repeat(12)}\n    return value;`;

      expect(normalizeMarkdownWhitespace(markdown)).toBe(
        '    const value = 1;\n    return value;'
      );
    });

  });

  describe('markdown previews', () => {

    it('does not count collapsed legacy whitespace as hidden content', () => {
      const markdown = `monja blanca${' '.repeat(600)}Mariposa rara`;

      expect(doesMarkdownPreviewTruncate(markdown, 500)).toBe(false);
    });

    it('detects Markdown images without a separate images array', () => {
      expect(hasMarkdownImages('![Guatemala](images/guatemala.jpg)')).toBe(true);
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
