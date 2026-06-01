import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { of } from 'rxjs';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { CoursesService } from '../courses/courses.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { ManagerService } from './manager.service';
import { StateService } from '../shared/state.service';
import { DialogGuardService } from '../shared/dialogs/dialog-guard.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';

describe('ManagerDashboardComponent', () => {
  let component: ManagerDashboardComponent;
  let fixture: ComponentFixture<ManagerDashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ManagerDashboardComponent, RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: CouchService,
          useValue: { currentTime: () => of(Date.now()), findAll: () => of([]), get: () => of({}), post: () => of({ docs: [] }) }
        },
        { provide: UserService, useValue: { get: () => ({ isUserAdmin: true }), shelf: { _rev: '' } } },
        { provide: CoursesService, useValue: { attachedItemsOfCourses: () => ({ resources: [], exams: [] }) } },
        { provide: ConfigurationService, useValue: { updateConfiguration: () => of({}) } },
        {
          provide: ManagerService,
          useValue: {
            getLogs: () => of({}), getChildPlanets: () => of([]), getPushedList: () => of([]),
            getVersion: () => of(''), getApkLatestVersion: () => of({})
          }
        },
        { provide: StateService, useValue: { configuration: { planetType: 'community', _id: '', streaming: false } } },
        { provide: DialogGuardService, useValue: { open: () => of({}) } },
        {
          provide: DialogsListService,
          useValue: {
            getListAndColumns: () => of({ tableData: [], columns: [] })
          }
        }
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
