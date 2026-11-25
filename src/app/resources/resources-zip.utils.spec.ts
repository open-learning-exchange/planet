import JSZip from 'jszip';

import { unzipFiles } from './resources-zip.utils';

describe('unzipFiles', () => {

  const readBytes = (blob: Blob) => new Promise<number[]>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.readAsArrayBuffer(blob);
  });

  it('gives each entry as a file under its zipped path, skipping Finder\'s metadata', async () => {
    const zip = new JSZip();
    zip.file('index.html', '<p>hi</p>');
    zip.file('img/logo.png', new Uint8Array([ 0x89, 0xff, 0x00 ]));
    zip.file('notes', 'x');
    zip.file('.DS_Store', 'x');
    zip.file('__MACOSX/._index.html', 'x');

    const files = await unzipFiles(await zip.generateAsync({ type: 'blob' }));

    expect(Object.keys(files)).toEqual([ 'index.html', 'img/logo.png', 'notes' ]);
    expect(Object.values(files).map(file => file.type)).toEqual([ 'text/html', 'image/png', 'text/plain' ]);
    expect(await readBytes(files['img/logo.png'])).toEqual([ 0x89, 0xff, 0x00 ]);
  });

  it('rejects a zip with nothing to save, so an edit can\'t replace a site with no files', async () => {
    const zip = new JSZip();
    zip.folder('site');
    zip.file('__MACOSX/site/._index.html', 'x');

    await expect(unzipFiles(await zip.generateAsync({ type: 'blob' }))).rejects.toThrow();
  });

});
