import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {

  const imageOfSize = (megabytes: number, name = 'cover.png') =>
    new File([ new Uint8Array(Math.round(megabytes * 1024 * 1024)) ], name, { type: 'image/png' });

  const addFiles = (component: FileUploadComponent, files: File[]) =>
    (component as any).addFiles(files as unknown as FileList);

  const componentWithLimit = (maxSizeMb: number) => {
    const component = new FileUploadComponent();
    component.accept = 'image/*';
    component.maxSizeMb = maxSizeMb;
    return component;
  };

  it('keeps files above maxSizeMb out of the upload state', () => {
    const component = componentWithLimit(10);
    const rejected: File[] = [];
    component.fileRejected.subscribe(file => rejected.push(file));
    const tooBig = imageOfSize(11);

    addFiles(component, [ tooBig ]);

    expect(rejected).toEqual([ tooBig ]);
    expect(component.added).toEqual([]);
    expect(component.errorMessage).toContain('10');
  });

  it('accepts files within maxSizeMb', () => {
    const component = componentWithLimit(10);

    addFiles(component, [ imageOfSize(1) ]);

    expect(component.added).toHaveLength(1);
    expect(component.errorMessage).toBe('');
  });

  it('leaves size unenforced when maxSizeMb is zero, preserving callers that validate size themselves', () => {
    const component = componentWithLimit(0);

    addFiles(component, [ imageOfSize(12) ]);

    expect(component.added).toHaveLength(1);
    expect(component.errorMessage).toBe('');
  });

});
