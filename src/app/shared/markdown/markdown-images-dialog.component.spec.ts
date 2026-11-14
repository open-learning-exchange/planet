import { DebugElement, getDebugNode } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { IMAGE_MAX_FALLBACK_BYTES } from '@shared/utils';

import { MarkdownImagesDialogComponent } from './markdown-images-dialog.component';
import { ResourcesService } from '../../resources/resources.service';

describe('MarkdownImagesDialogComponent', () => {
  let component: MarkdownImagesDialogComponent;
  let fixture: ComponentFixture<MarkdownImagesDialogComponent>;
  let resourcesSubject: Subject<any>;
  let resourcesServiceMock: {
    resourcesListener: ReturnType<typeof vi.fn>;
    requestResourcesUpdate: ReturnType<typeof vi.fn>;
    simpleMediaType: ReturnType<typeof vi.fn>;
  };
  let couchServiceMock: { datePlaceholder: object, updateDocument: ReturnType<typeof vi.fn> };
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let dialogsLoadingServiceMock: { start: ReturnType<typeof vi.fn>, stop: ReturnType<typeof vi.fn> };
  let planetMessageServiceMock: { showAlert: ReturnType<typeof vi.fn> };

  const dialogData = {
    imageGroup: { teams: 'team-a' }
  };

  beforeEach(async () => {
    resourcesSubject = new Subject<any>();
    resourcesServiceMock = {
      resourcesListener: vi.fn().mockReturnValue(resourcesSubject.asObservable()),
      requestResourcesUpdate: vi.fn(),
      simpleMediaType: vi.fn().mockReturnValue('image')
    };
    couchServiceMock = { datePlaceholder: {}, updateDocument: vi.fn().mockReturnValue(of({ id: 'new-id' })) };
    dialogRefMock = { close: vi.fn() };
    dialogsLoadingServiceMock = { start: vi.fn(), stop: vi.fn() };
    planetMessageServiceMock = { showAlert: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MarkdownImagesDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: DialogsLoadingService, useValue: dialogsLoadingServiceMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        { provide: UserService, useValue: { get: () => ({ name: 'uploader' }) } },
        { provide: StateService, useValue: { configuration: { code: 'planet' } } },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownImagesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should filter received resources for images matching group or community', () => {
    const mockResources = [
      { doc: { filename: 'img1.png', mediaType: 'image', privateFor: 'community' } },
      { doc: { filename: 'img2.png', mediaType: 'image', privateFor: { teams: 'team-a' } } },
      { doc: { filename: 'img3.png', mediaType: 'image', privateFor: { teams: 'other-team' } } },
      { doc: { filename: 'doc1.pdf', mediaType: 'pdf', privateFor: 'community' } }
    ];

    resourcesSubject.next(mockResources);

    expect(component.images.length).toBe(2);
    expect(component.images.map(img => img.filename)).toEqual(['img1.png', 'img2.png']);
  });

  it('should unsubscribe from resource updates when component is destroyed', () => {
    const initialResources = [
      { doc: { filename: 'img1.png', mediaType: 'image', privateFor: 'community' } }
    ];
    resourcesSubject.next(initialResources);
    expect(component.images.length).toBe(1);
    expect(resourcesSubject.observers).toHaveLength(1);

    // Destroy the fixture and component
    fixture.destroy();
    expect(resourcesSubject.observers).toHaveLength(0);

    // Emit another update
    const updatedResources = [
      { doc: { filename: 'img1.png', mediaType: 'image', privateFor: 'community' } },
      { doc: { filename: 'img2.png', mediaType: 'image', privateFor: 'community' } }
    ];
    resourcesSubject.next(updatedResources);

    // Images should remain unchanged because subscription was terminated by DestroyRef
    expect(component.images.length).toBe(1);
  });

  it.each(['selection', 'Cancel'])('should release subscriptions after a %s close', async closeRoute => {
    const initialSubscribers = resourcesSubject.observers.length;
    const selectedImage = { filename: 'photo.jpg', _id: 'img-123' };
    const dialogRef = TestBed.inject(MatDialog).open(MarkdownImagesDialogComponent, { data: dialogData });
    const componentRef = dialogRef.componentRef;
    componentRef.changeDetectorRef.detectChanges();
    expect(resourcesSubject.observers).toHaveLength(initialSubscribers + 1);
    const closed = dialogRef.afterClosed().toPromise();

    if (closeRoute === 'selection') {
      dialogRef.componentInstance.selectImage(selectedImage);
    } else {
      const dialogElement = getDebugNode(componentRef.location.nativeElement) as DebugElement;
      dialogElement.query(By.directive(MatDialogClose)).nativeElement.click();
    }

    expect(await closed).toEqual(closeRoute === 'selection' ? selectedImage : '');
    expect(componentRef.hostView.destroyed).toBe(true);
    expect(resourcesSubject.observers).toHaveLength(initialSubscribers);
  });

  it('should alert and reject upload if filename already exists', () => {
    component.images = [{ filename: 'existing_photo.jpg' }];
    const file = new File([''], 'existing photo.jpg', { type: 'image/jpeg' });

    component.uploadImage(file);

    expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith(
      'An image with that filename exists. Please rename or select another image.'
    );
    expect(couchServiceMock.updateDocument).not.toHaveBeenCalled();
  });

  describe('uploading', () => {
    const originalImage = window.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const photo = () => new File([ new Uint8Array(1024) ], 'my photo.jpg', { type: 'image/jpeg' });
    let canvas: { width: number, height: number, getContext: () => any, toBlob: (done: (blob: Blob) => void, type: string) => void };

    class LoadedImage {
      naturalWidth = 4000;
      naturalHeight = 3000;
      onload: () => void = () => {};
      onerror: () => void = () => {};

      set src(_value: string) {
        setTimeout(() => this.onload());
      }
    }

    class BrokenImage extends LoadedImage {
      set src(_value: string) {
        setTimeout(() => this.onerror());
      }
    }

    class FittingImage extends LoadedImage {
      naturalWidth = 800;
      naturalHeight = 600;
    }

    beforeEach(() => {
      canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (done, type) => done(new Blob([ 'resized' ], { type }))
      };
      const realCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement')
        .mockImplementation((tag: string) => tag === 'canvas' ? canvas as any : realCreateElement(tag));
      URL.createObjectURL = vi.fn().mockReturnValue('blob:image');
      URL.revokeObjectURL = vi.fn();
      (window as any).Image = LoadedImage;
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      (window as any).Image = originalImage;
      vi.restoreAllMocks();
    });

    it('should resize an image and save it with its doc in one write', async () => {
      component.uploadImage(photo());
      await vi.waitFor(() => expect(dialogRefMock.close).toHaveBeenCalled());

      expect(canvas.width).toBe(1600);
      expect(couchServiceMock.updateDocument).toHaveBeenCalledTimes(1);
      const [ db, doc ] = couchServiceMock.updateDocument.mock.calls[0];
      expect(db).toBe('resources');
      expect(doc).toMatchObject({
        title: 'my_photo.webp', filename: 'my_photo.webp', private: true, privateFor: dialogData.imageGroup, mediaType: 'image'
      });
      expect(doc._attachments['my_photo.webp']).toEqual({ content_type: 'image/webp', data: btoa('resized') });
      expect(dialogRefMock.close).toHaveBeenCalledWith({ _id: 'new-id', filename: 'my_photo.webp' });
      expect(dialogsLoadingServiceMock.start).toHaveBeenCalledTimes(1);
      expect(dialogsLoadingServiceMock.stop).toHaveBeenCalledTimes(1);
    });

    it('should keep a small image that already fits unchanged', async () => {
      (window as any).Image = FittingImage;

      component.uploadImage(new File([ 'diagram' ], 'my diagram.png', { type: 'image/png' }));
      await vi.waitFor(() => expect(dialogRefMock.close).toHaveBeenCalled());

      const [ , doc ] = couchServiceMock.updateDocument.mock.calls[0];
      expect(doc.filename).toBe('my_diagram.png');
      expect(doc._attachments['my_diagram.png']).toEqual({ content_type: 'image/png', data: btoa('diagram') });
      expect(document.createElement).not.toHaveBeenCalledWith('canvas');
    });

    it('should re-encode an image that fits but is too large to keep', async () => {
      (window as any).Image = FittingImage;

      component.uploadImage(new File([ new Uint8Array(300 * 1024) ], 'diagram.png', { type: 'image/png' }));
      await vi.waitFor(() => expect(dialogRefMock.close).toHaveBeenCalled());

      expect(canvas.width).toBe(800);
      expect(couchServiceMock.updateDocument.mock.calls[0][1].filename).toBe('diagram.webp');
    });

    it('should reject an image whose resized name already exists', async () => {
      component.images = [ { filename: 'my_photo.webp' } ];

      component.uploadImage(photo());
      await vi.waitFor(() => expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith(
        'An image with that filename exists. Please rename or select another image.'
      ));

      expect(couchServiceMock.updateDocument).not.toHaveBeenCalled();
    });

    it('should store a GIF within the limit as uploaded', async () => {
      component.uploadImage(new File([ 'animated' ], 'clip.gif', { type: 'image/gif' }));
      await vi.waitFor(() => expect(dialogRefMock.close).toHaveBeenCalled());

      const [ , doc ] = couchServiceMock.updateDocument.mock.calls[0];
      expect(doc._attachments['clip.gif']).toEqual({ content_type: 'image/gif', data: btoa('animated') });
      expect(document.createElement).not.toHaveBeenCalledWith('canvas');
    });

    it('should reject a GIF over the limit', () => {
      component.uploadImage(new File([ new Uint8Array(IMAGE_MAX_FALLBACK_BYTES + 1) ], 'clip.gif', { type: 'image/gif' }));

      expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith('GIFs can be at most 2 MB. Please select a smaller image.');
      expect(couchServiceMock.updateDocument).not.toHaveBeenCalled();
    });

    it('should alert when an image cannot be processed', async () => {
      (window as any).Image = BrokenImage;

      component.uploadImage(new File([ 'not an image' ], 'photo.heic', { type: 'image/heic' }));
      await vi.waitFor(() => expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith(
        'Image could not be processed. Please choose a JPEG or PNG image.'
      ));

      expect(couchServiceMock.updateDocument).not.toHaveBeenCalled();
      expect(dialogsLoadingServiceMock.stop).toHaveBeenCalledTimes(1);
    });

    it('should alert and keep the dialog open when the write fails', async () => {
      couchServiceMock.updateDocument.mockReturnValue(throwError(() => new Error('write failed')));

      component.uploadImage(photo());
      await vi.waitFor(() => expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith(
        'There was a problem uploading the image.'
      ));

      expect(dialogRefMock.close).not.toHaveBeenCalled();
    });

    it('should leave a 403 to the message CouchService already shows', async () => {
      couchServiceMock.updateDocument.mockReturnValue(throwError(() => ({ status: 403 })));

      component.uploadImage(photo());
      await vi.waitFor(() => expect(dialogsLoadingServiceMock.stop).toHaveBeenCalled());

      expect(planetMessageServiceMock.showAlert).not.toHaveBeenCalled();
    });
  });
});
