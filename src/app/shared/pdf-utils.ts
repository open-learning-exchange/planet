let pdfMakePromise: Promise<any> | null = null;
let htmlToPdfmakePromise: Promise<any> | null = null;

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
