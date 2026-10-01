import { DebugElement, getDebugNode } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { DialogsImagesComponent } from './dialogs-images.component';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';

describe('DialogsImagesComponent', () => {
  let component: DialogsImagesComponent;
  let fixture: ComponentFixture<DialogsImagesComponent>;
  let resourcesSubject: Subject<any>;
  let resourcesServiceMock: {
    resourcesListener: ReturnType<typeof vi.fn>;
    requestResourcesUpdate: ReturnType<typeof vi.fn>;
    updateResource: ReturnType<typeof vi.fn>;
  };
  let planetMessageServiceMock: { showAlert: ReturnType<typeof vi.fn> };

  const dialogData = {
    imageGroup: { teams: 'team-a' }
  };

  beforeEach(async () => {
    resourcesSubject = new Subject<any>();
    resourcesServiceMock = {
      resourcesListener: vi.fn().mockReturnValue(resourcesSubject.asObservable()),
      requestResourcesUpdate: vi.fn(),
      updateResource: vi.fn()
    };
    planetMessageServiceMock = { showAlert: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DialogsImagesComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: {} },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        { provide: UserService, useValue: {} },
        { provide: StateService, useValue: {} },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogsImagesComponent);
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
    const dialogRef = TestBed.inject(MatDialog).open(DialogsImagesComponent, { data: dialogData });
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
    expect(resourcesServiceMock.updateResource).not.toHaveBeenCalled();
  });
});
