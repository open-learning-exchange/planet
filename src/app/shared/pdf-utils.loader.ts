type PdfMakeType = typeof import('pdfmake/build/pdfmake');
type HtmlToPdfmakeType = typeof import('html-to-pdfmake');
type ShowdownModule = typeof import('showdown');
type ShowdownConverter = import('showdown').Converter;

export interface PdfToolchain {
  pdfMake: PdfMakeType;
  htmlToPdfmake: HtmlToPdfmakeType;
  showdown: ShowdownModule;
  converter: ShowdownConverter;
}

let pdfToolchainPromise: Promise<PdfToolchain> | null = null;
let cachedToolchain: PdfToolchain | null = null;

type ModuleWithDefault<T> = T & { default?: T };

const resolveModule = <T>(module: ModuleWithDefault<T>): T => (module.default ?? module) as unknown as T;

export const loadPdfToolchain = async (): Promise<PdfToolchain> => {
  if (!pdfToolchainPromise) {
    pdfToolchainPromise = (async () => {
      const [ pdfMakeModule, pdfFontsModule, htmlToPdfmakeModule, showdownModule ] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
        import('html-to-pdfmake'),
        import('showdown')
      ]);
      const pdfMake = resolveModule<PdfMakeType>(pdfMakeModule as ModuleWithDefault<PdfMakeType>);
      const pdfFonts = resolveModule(pdfFontsModule as ModuleWithDefault<any>);
      const htmlToPdfmake = resolveModule<HtmlToPdfmakeType>(htmlToPdfmakeModule as ModuleWithDefault<HtmlToPdfmakeType>);
      const showdown = resolveModule<ShowdownModule>(showdownModule as ModuleWithDefault<ShowdownModule>);
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
      const converter = new showdown.Converter() as ShowdownConverter;
      const toolchain: PdfToolchain = { pdfMake, htmlToPdfmake, showdown, converter };
      cachedToolchain = toolchain;
      return toolchain;
    })();
  }
  return pdfToolchainPromise;
};

export const getCachedPdfToolchain = (): PdfToolchain | null => cachedToolchain;
