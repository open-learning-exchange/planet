import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ManagerDashboardComponent } from './manager-dashboard.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { CoursesService } from '../courses/courses.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { StateService } from '../shared/state.service';
import { ManagerService } from './manager.service';
import { DialogGuardService } from '../shared/dialogs/dialog-guard.service';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { SyncService } from '../shared/sync.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('ManagerDashboardComponent', () => {
  let component: ManagerDashboardComponent;
  let fixture: ComponentFixture<ManagerDashboardComponent>;

  const dialogsListServiceMock = {
    getListAndColumns: vi.fn().mockReturnValue(of({ tableData: [], columns: [] }))
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue({ isUserAdmin: true }),
    shelf: { _rev: 'shelf_rev' },
    userChange$: new Subject(),
    doesUserHaveRole: vi.fn().mockReturnValue(true),
    isBetaEnabled: vi.fn().mockReturnValue(true)
  };

  const stateServiceMock = {
    configuration: { planetType: 'nation', streaming: false, _id: 'config_id', parentDomain: 'parent.domain', code: 'planet_code' },
    couchStateListener: vi.fn().mockReturnValue(of([]))
  };

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn(),
    closeDialogsForm: vi.fn(),
    showErrorMessage: vi.fn()
  };

  const couchServiceMock = {
    currentTime: vi.fn().mockReturnValue(of(Date.now())),
    get: vi.fn().mockReturnValue(of({})),
    post: vi.fn().mockReturnValue(of({ docs: [] })),
    findAll: vi.fn().mockReturnValue(of([])),
    currentTimeListener: vi.fn().mockReturnValue(of(Date.now()))
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ManagerDashboardComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: HttpClient, useValue: HttpTestingController},
        { provide: ActivatedRoute, useValue: {} },
        { provide: DialogsListService, useValue: dialogsListServiceMock },
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: SyncService, useValue: { getReplicationState: vi.fn().mockReturnValue(of({})) } },
        { provide: CouchService, useValue: couchServiceMock },
        CoursesService,
        PlanetMessageService,
        ConfigurationService,
        {
          provide: ManagerService,
          useValue: {
            getLogs: vi.fn().mockReturnValue(of([])),
            getPushedList: vi.fn().mockReturnValue(of([])),
            getChildPlanets: vi.fn().mockReturnValue(of([])),
            getVersion: vi.fn().mockReturnValue(of('')),
            getApkLatestVersion: vi.fn().mockReturnValue(of({}))
          }
        },
        DialogGuardService,
        { provide: MatDialog, useValue: { open: vi.fn() } }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
