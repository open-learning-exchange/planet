import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { RequestsComponent } from './requests.component';
import { CouchService } from '../../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ReportsService } from '../reports/reports.service';
import { ManagerService } from '../manager.service';
import { DeviceInfoService } from '../../shared/device-info.service';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { UserService } from '../../shared/user.service';

describe('RequestsComponent', () => {
  let component: RequestsComponent;
  let fixture: ComponentFixture<RequestsComponent>;

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn(),
    closeDialogsForm: vi.fn(),
    showErrorMessage: vi.fn()
  };

  const dialogsListServiceMock = {
    getListAndColumns: vi.fn().mockReturnValue(of({ tableData: [], columns: [] }))
  };

  const stateServiceMock = {
    configuration: { planetType: 'nation' },
    couchStateListener: vi.fn().mockReturnValue(of([]))
  };

  const userServiceMock = {
    userChange$: new Subject(),
    doesUserHaveRole: vi.fn().mockReturnValue(true),
    get: vi.fn().mockReturnValue({ isUserAdmin: true })
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RequestsComponent, NoopAnimationsModule],
      providers: [
        CouchService,
        ValidatorService,
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: DialogsListService, useValue: dialogsListServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: () => '' })
          }
        },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: userServiceMock },
        PlanetMessageService,
        ReportsService,
        ManagerService,
        DeviceInfoService,
        provideHttpClient(withInterceptorsFromDi())
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
