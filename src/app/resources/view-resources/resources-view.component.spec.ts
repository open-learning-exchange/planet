import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { ResourcesViewComponent } from './resources-view.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { ResourcesService } from '../resources.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { LinkCopyService } from '../../shared/link-copy.service';

describe('ResourcesViewComponent', () => {

  let component: ResourcesViewComponent;
  let fixture: ComponentFixture<ResourcesViewComponent>;
  let statusElement;
  let testimage;
  let de;

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn(),
    closeDialogsForm: vi.fn(),
    showErrorMessage: vi.fn()
  };

  const stateServiceMock = {
    configuration: { parentDomain: 'parent.domain', code: 'planet_code' }
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue({ isUserAdmin: true, name: 'user' }),
    shelf: { resourceIds: [] }
  };

  const resourcesServiceMock = {
    requestResourcesUpdate: vi.fn(),
    resourcesListener: vi.fn().mockReturnValue(of([])),
    isActiveResourceFetch: false
  };

  const couchServiceMock = {
    get: vi.fn().mockReturnValue(of({}))
  };

  const linkCopyServiceMock = {
    copyLink: vi.fn()
  };

  const planetMessageServiceMock = {
    showAlert: vi.fn(),
    showMessage: vi.fn()
  };

  beforeEach(() => {
    resourcesServiceMock.resourcesListener.mockReturnValue(of([]));
    linkCopyServiceMock.copyLink.mockReset();
    TestBed.configureTestingModule({
      imports: [ ResourcesViewComponent, MatIconTestingModule ],
      providers: [
        { provide: HttpClient, useValue: HttpTestingController},
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock },
        { provide: DeviceInfoService, useValue: { watchDeviceType: () => of(DeviceType.DESKTOP) } },
        { provide: LinkCopyService, useValue: linkCopyServiceMock },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { parent: false }
            },
            paramMap: of({ get: () => 'id' })
          }
        },
        provideNoopAnimations()
      ]
    });
    fixture = TestBed.createComponent(ResourcesViewComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    statusElement = de.nativeElement.querySelector('.km-resource-view img');
    testimage = { filename: 'scenery.png', id: 'scenery.png', mediaType: 'img',
      attachments: { 'scenery.png': { content_type: 'application/image' } } };
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('copies local resource links from the desktop action', () => {
    resourcesServiceMock.resourcesListener.mockReturnValue(of([ { _id: 'id', doc: {} } ]));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.km-copy-resource-link')).nativeElement.click();

    expect(linkCopyServiceMock.copyLink).toHaveBeenCalledWith(
      [ '/resources/view', 'id' ],
      {
        success: 'Resource link copied to clipboard',
        failure: 'Failed to copy resource link'
      }
    );
  });

  it('does not offer link copying for a parent resource', () => {
    component.parent = true;
    resourcesServiceMock.resourcesListener.mockReturnValue(of([ { _id: 'id', doc: {} } ]));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.km-copy-resource-link'))).toBeNull();
  });

  it('renders a labeled menu item for link copying on smaller screens', async () => {
    component.deviceType = DeviceType.MOBILE;
    resourcesServiceMock.resourcesListener.mockReturnValue(of([ { _id: 'id', doc: {} } ]));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.menu')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const copyButton = document.body.querySelector('.km-copy-resource-link') as HTMLButtonElement;
    expect(copyButton).not.toBeNull();
    expect(copyButton.textContent).toContain('Copy Resource Link');
    copyButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(linkCopyServiceMock.copyLink).toHaveBeenCalled();
    expect(document.body.querySelector('.km-copy-resource-link')).toBeNull();
  });

  it('shows the selected attachment size and the total only for bundles', () => {
    resourcesServiceMock.resourcesListener.mockReturnValue(of([ {
      _id: 'id',
      doc: {
        addedBy: 'user',
        sourcePlanet: 'planet_code',
        openWhichFile: 'index.html',
        _attachments: {
          'index.html': { length: 50000 },
          'style.css': { length: 100000 }
        }
      }
    } ]));

    component.ngOnInit();

    expect(component.downloadFileSize).toBe('48.8 KB');
    expect(component.formattedFileSize).toBe('146.5 KB');
  });

  it('omits the redundant total for a single attachment', () => {
    resourcesServiceMock.resourcesListener.mockReturnValue(of([ {
      _id: 'id',
      doc: {
        addedBy: 'user',
        sourcePlanet: 'planet_code',
        _attachments: { 'manual.pdf': { length: 2516582 } }
      }
    } ]));

    component.ngOnInit();

    expect(component.downloadFileSize).toBe('2.4 MB');
    expect(component.formattedFileSize).toBe('');
  });


  /* TODO: Update tests to use vitest spies
    it('should make a get request to couchService', () => {
        getSpy = vi.spyOn(couchServiceMock, 'get').and.returnValue(of(testimage.id));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(getSpy).toHaveBeenCalledWith('resources/' + testimage.id);
        });
      });

    it('should getResource', () => {
        getSpy = vi.spyOn(couchServiceMock, 'get').and.returnValue(of(testimage));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe(testimage);
        });
      });

    it('should There was a problem getResource', () => {
        getSpy = vi.spyOn(couchServiceMock, 'get').and.returnValue(throwError({ Error }));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe('Error');
        });
      });
    */
});
