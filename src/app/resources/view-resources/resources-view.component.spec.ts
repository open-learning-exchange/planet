import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { ResourcesViewComponent } from './resources-view.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { MaterialModule } from '../../shared/material.module';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { ResourcesService } from '../resources.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DeviceInfoService } from '../../shared/device-info.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('ResourcesViewComponent', () => {

  let component: ResourcesViewComponent;
  let fixture: ComponentFixture<ResourcesViewComponent>;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ResourcesViewComponent, NoopAnimationsModule ],
      providers: [
        { provide: HttpClient, useValue: HttpTestingController},
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        PlanetMessageService,
        DeviceInfoService,
        CouchService,
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
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });


  /* TODO: Update tests to use vitest spies
    it('should make a get request to couchService', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(of(testimage.id));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(getSpy).toHaveBeenCalledWith('resources/' + testimage.id);
        });
      });

    it('should getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(of(testimage));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe(testimage);
        });
      });

    it('should There was a problem getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(Rx.Observable.throw({ Error }));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe('Error');
        });
      });
    */
});
