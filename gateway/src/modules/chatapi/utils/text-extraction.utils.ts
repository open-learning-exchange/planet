import textract from 'textract';

export async function extractTextFromDocument(data: Buffer, mimetype: string): Promise<string> {
  return new Promise((resolve, reject) => {
    textract.fromBufferWithMime(mimetype, data, (error, text) => {
      if (error) {
        reject(error);
      } else {
        resolve(text);
      }
    });
  });
}
