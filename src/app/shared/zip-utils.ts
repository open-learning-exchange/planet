import type JSZip from 'jszip';

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
