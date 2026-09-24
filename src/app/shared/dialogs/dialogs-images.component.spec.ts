import { DebugElement, getDebugNode } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { DialogsImagesComponent } from './dialogs-images.component';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';

describe('DialogsImagesComponent', () => {
  let component: DialogsImagesComponent;
  let fixture: ComponentFixture<DialogsImagesComponent>;
  let resourcesSubject: BehaviorSubject<any>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let resourcesServiceMock: {
    resourcesListener: ReturnType<typeof vi.fn>;
    requestResourcesUpdate: ReturnType<typeof vi.fn>;
    simpleMediaType: ReturnType<typeof vi.fn>;
    updateResource: ReturnType<typeof vi.fn>;
  };
  let userServiceMock: { get: ReturnType<typeof vi.fn> };
  let stateServiceMock: { configuration: { code: string } };
  let planetMessageServiceMock: { showAlert: ReturnType<typeof vi.fn> };

  const dialogData = {
    imageGroup: { teams: 'team-a' }
  };

  beforeEach(async () => {
    resourcesSubject = new BehaviorSubject<any>(null);
    dialogRefMock = { close: vi.fn() };
    resourcesServiceMock = {
      resourcesListener: vi.fn().mockReturnValue(resourcesSubject.asObservable()),
      requestResourcesUpdate: vi.fn(),
      simpleMediaType: vi.fn().mockReturnValue('image'),
      updateResource: vi.fn().mockReturnValue(of([{ id: 'res-new' }]))
    };
    userServiceMock = {
      get: vi.fn().mockReturnValue({ name: 'testuser' })
    };
    stateServiceMock = {
      configuration: { code: 'testplanet' }
    };
    planetMessageServiceMock = {
      showAlert: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DialogsImagesComponent, MatDialogModule, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogsImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and request resources update on init', () => {
    expect(component).toBeTruthy();
    expect(resourcesServiceMock.resourcesListener).toHaveBeenCalledWith(false);
    expect(resourcesServiceMock.requestResourcesUpdate).toHaveBeenCalledWith(false, false);
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

  it.each(['selection', 'Cancel'])('should release subscriptions after repeated %s closes', async closeRoute => {
    const initialSubscribers = resourcesSubject.observers.length;
    const dialog = TestBed.inject(MatDialog);
    const selectedImage = { filename: 'photo.jpg', _id: 'img-123' };

    for (let cycle = 0; cycle < 3; cycle++) {
      const dialogRef = dialog.open(DialogsImagesComponent, { data: dialogData });
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
    }
  });

  it('should filter images by search query', () => {
    component.images = [
      { filename: 'apple.png' },
      { filename: 'banana.png' },
      { filename: 'pineapple.png' }
    ];

    component.searchQuery = 'apple';
    expect(component.filteredImages.map(img => img.filename)).toEqual(['apple.png', 'pineapple.png']);

    component.searchQuery = 'BANANA';
    expect(component.filteredImages.map(img => img.filename)).toEqual(['banana.png']);

    component.searchQuery = '';
    expect(component.filteredImages.length).toBe(3);
  });

  it('should close dialog with selected image on selectImage', () => {
    const selectedImage = { filename: 'photo.jpg', _id: 'img-123' };
    component.selectImage(selectedImage);

    expect(dialogRefMock.close).toHaveBeenCalledWith(selectedImage);
  });

  it('should alert and reject upload if filename already exists', () => {
    component.images = [{ filename: 'existing_photo.jpg' }];
    const file = new File([''], 'existing photo.jpg', { type: 'image/jpeg' });

    component.uploadImage(file);

    expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith(
      'An image with that filename exists. Please rename or select another image.'
    );
    expect(resourcesServiceMock.updateResource).not.toHaveBeenCalled();
  });

  it('should alert and reject upload if mediaType is not an image', () => {
    component.images = [];
    resourcesServiceMock.simpleMediaType.mockReturnValue('pdf');
    const file = new File([''], 'document.pdf', { type: 'application/pdf' });

    component.uploadImage(file);

    expect(planetMessageServiceMock.showAlert).toHaveBeenCalledWith('File must be an image');
    expect(resourcesServiceMock.updateResource).not.toHaveBeenCalled();
  });

  it('should successfully upload valid image and close dialog', () => {
    component.images = [];
    resourcesServiceMock.simpleMediaType.mockReturnValue('image');
    const file = new File([''], 'new photo.png', { type: 'image/png' });

    component.uploadImage(file);

    expect(resourcesServiceMock.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'new_photo.png',
        filename: 'new_photo.png',
        private: true,
        privateFor: { teams: 'team-a' },
        sourcePlanet: 'testplanet',
        resideOn: 'testplanet',
        addedBy: 'testuser',
        mediaType: 'image'
      }),
      file,
      undefined,
      'new_photo.png'
    );
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'new_photo.png',
        _id: 'res-new'
      })
    );
  });
});
