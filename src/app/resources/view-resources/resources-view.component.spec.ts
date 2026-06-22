import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { ResourcesViewComponent } from './resources-view.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { ResourcesService } from '../resources.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DeviceInfoService } from '../../shared/device-info.service';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ResourcesViewComponent, MatIconTestingModule ],
      providers: [
        { provide: HttpClient, useValue: HttpTestingController},
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        PlanetMessageService,
        DeviceInfoService,
        { provide: CouchService, useValue: couchServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { parent: {} }
            },
            paramMap: of({ get: () => 'id' })
          }
        }
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
