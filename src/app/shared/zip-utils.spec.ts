import { loadJSZip, loadZipFile } from './zip-utils';

describe('zip-utils', () => {
  it('loads JSZip dynamically', async () => {
    const jsZip = await loadJSZip();
    expect(jsZip).toBeDefined();
    expect(typeof jsZip).toBe('function');
  });

  it('loads a zip file successfully', async () => {
    const jsZipConstructor = await loadJSZip();
    const zipInstance = new jsZipConstructor();
    zipInstance.file('test.txt', 'hello world');
    const zipBlob = await zipInstance.generateAsync({ type: 'blob' });

    const loadedZip = await loadZipFile(zipBlob);
    expect(loadedZip).toBeDefined();
    expect(loadedZip.files['test.txt']).toBeDefined();

    const content = await loadedZip.files['test.txt'].async('text');
    expect(content).toBe('hello world');
  });
});
