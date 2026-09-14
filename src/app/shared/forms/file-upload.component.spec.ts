import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  it('reports the excess when more files are selected than there are slots', () => {
    const component = new FileUploadComponent();
    component.multiple = true;
    component.maxFiles = 3;
    const files = Array.from({ length: 4 }, () => new File([ 'image' ], 'screen.png', { type: 'image/png' }));

    component.onInputChange({ target: { files } } as unknown as Event);

    expect(component.added).toHaveLength(3);
    expect(component.errorMessage).toContain('Maximum');
  });
});
