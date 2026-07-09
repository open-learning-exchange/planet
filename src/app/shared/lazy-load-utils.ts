import type JSZip from 'jszip';

let pdfMakePromise: Promise<any> | null = null;
let htmlToPdfmakePromise: Promise<any> | null = null;
let jsZipPromise: Promise<typeof JSZip> | null = null;

export function loadPdfMake(): Promise<any> {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]).then(([ pdfMakeModule, pdfFontsModule ]) => {
      const pdfMake = pdfMakeModule.default;
      pdfMake.addVirtualFileSystem(pdfFontsModule.default);
      return pdfMake;
    }).catch((error) => {
      pdfMakePromise = null;
      throw error;
    });
  }
  return pdfMakePromise;
}

export function loadHtmlToPdfmake(): Promise<any> {
  if (!htmlToPdfmakePromise) {
    htmlToPdfmakePromise = import('html-to-pdfmake').then(module => module.default).catch((error) => {
      htmlToPdfmakePromise = null;
      throw error;
    });
  }
  return htmlToPdfmakePromise;
}

export function loadJSZip(): Promise<typeof JSZip> {
  if (!jsZipPromise) {
    jsZipPromise = import('jszip').then(module => module.default).catch((error) => {
      jsZipPromise = null;
      throw error;
    });
  }
  return jsZipPromise;
}

export async function loadZipFile(file: Blob): Promise<JSZip> {
  const JSZip = await loadJSZip();
  return new JSZip().loadAsync(file);
}
