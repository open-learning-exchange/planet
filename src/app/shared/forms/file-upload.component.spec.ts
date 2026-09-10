import { vi } from 'vitest';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent staged attachments', () => {
  let component: FileUploadComponent;
  const file = (name = 'screen.png', type = 'image/png') => new File([ 'image' ], name, { type });
  const select = (files: File[]) => component.onInputChange({ target: { files } } as unknown as Event);

  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:preview'), revokeObjectURL: vi.fn() });
    component = new FileUploadComponent();
    component.multiple = true;
    component.maxFiles = 3;
    component.maxFileSize = 100;
    component.accept = 'image/png,image/jpeg';
    component.imagePreview = true;
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  it('caps multi-select at three files and reports the excess', () => {
    select([ file(), file(), file(), file() ]);
    expect(component.added).toHaveLength(3);
    expect(component.canAddFiles).toBe(false);
    expect(component.errorMessage).toContain('Maximum');
  });

  it('applies the same limit to dropped files', () => {
    component.onDrop({ preventDefault: vi.fn(), dataTransfer: { files: [ file(), file(), file(), file() ] } } as unknown as DragEvent);
    expect(component.added).toHaveLength(3);
    expect(component.isDragging).toBe(false);
  });

  it('rejects empty, oversized and disallowed files without creating previews', () => {
    const oversized = file();
    Object.defineProperty(oversized, 'size', { value: 101 });
    select([ oversized, new File([], 'empty.png', { type: 'image/png' }), file('text.txt', 'text/plain') ]);
    expect(component.added).toEqual([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([
    { limit: 100, size: 100, description: 'accepts files at the size limit' },
    { limit: undefined, size: 1000, description: 'does not impose a new size restriction on existing callers' }
  ])('$description', ({ limit, size }) => {
    component.maxFileSize = limit;
    const selected = file();
    Object.defineProperty(selected, 'size', { value: size });
    select([ selected ]);
    expect(component.added).toHaveLength(1);
  });

  it('revokes previews on removal and cancellation and keeps removed files out of submitted state', () => {
    const stateChange = vi.spyOn(component.stateChange, 'emit');
    select([ file() ]);
    component.removeAdded(0);
    expect(stateChange).toHaveBeenLastCalledWith({ added: [], retained: [], removed: [] });
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();

    select([ file() ]);
    component.ngOnDestroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
