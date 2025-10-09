import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../shared/material.module';
import { UsersComponent } from './users.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { UsersService } from './users.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(waitForAsync(() => {
    const userServiceMock = {
      get: () => ({ isUserAdmin: true }),
      shelf: {}
    };
    const planetMessageServiceMock = { showMessage: () => {}, showAlert: () => {} };
    const stateServiceMock = { configuration: { planetType: 'community' } };
    const dialogsLoadingServiceMock = { start: () => {}, stop: () => {} };
    const managerServiceMock = { getChildPlanets: () => of([]) };
    const usersServiceMock = {
      usersListener: () => of([]),
      requestUserData: () => {},
      roleList: [],
      allRolesList: []
    };
    const deviceInfoServiceMock = { getDeviceType: () => 'desktop' };

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        RouterTestingModule,
        HttpClientModule,
        BrowserAnimationsModule,
        MaterialModule
      ],
      declarations: [ UsersComponent ],
      providers: [
        CouchService,
        { provide: UserService, useValue: userServiceMock },
        { provide: PlanetMessageService, useValue: planetMessageServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: DialogsLoadingService, useValue: dialogsLoadingServiceMock },
        { provide: ManagerService, useValue: managerServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: DeviceInfoService, useValue: deviceInfoServiceMock }
      ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});