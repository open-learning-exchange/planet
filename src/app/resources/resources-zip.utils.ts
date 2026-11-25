import type JSZip from 'jszip';
import mime from 'mime';

let jsZipPromise: Promise<typeof JSZip> | null = null;

export const loadJSZip = (): Promise<typeof JSZip> => {
  if (!jsZipPromise) {
    jsZipPromise = import('jszip').then(module => module.default).catch((error) => {
      jsZipPromise = null;
      throw error;
    });
  }
  return jsZipPromise;
};

export const loadZipFile = async (file: Blob): Promise<JSZip> => {
  const jsZip = await loadJSZip();
  return new jsZip().loadAsync(file);
};

export const zipFileNames = (zip: JSZip): string[] => Object.keys(zip.files)
  .filter(path => !zip.files[path].dir && path.indexOf('DS_Store') === -1 && !path.startsWith('__MACOSX/'));

// Names stay as zipped, because the site's own pages link to them by path
export const unzipFiles = async (zipFile: Blob): Promise<{ [name: string]: File }> => {
  const zip = await loadZipFile(zipFile);
  const names = zipFileNames(zip);
  // Saving no files would replace an existing site's files with nothing
  if (names.length === 0) {
    throw new Error('The zip has no files to save');
  }
  return Object.fromEntries(await Promise.all(names.map(async (name) => [
    name,
    new File([ await zip.file(name).async('blob') ], name, { type: mime.getType(name) || 'text/plain' })
  ])));
};
