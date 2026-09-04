import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { CoursesComponent } from './courses.component';
import { CouchService } from '@shared/database/couchdb.service';
import { FormErrorMessagesComponent } from '@shared/forms/form-error-messages.component';
import { DialogsListService } from '@shared/dialogs/dialogs-list.service';
import { CoursesService } from './courses.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { UserService } from '@shared/auth/user.service';
import { SyncService } from '@shared/database/sync.service';
import { StateService } from '@shared/state.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';
import { TagsService } from '@shared/forms/tags/tags.service';
import { SearchService } from '@shared/search/search.service';
import { DeviceInfoService } from '@shared/platform/device-info.service';
import { FuzzySearchService } from '@shared/search/fuzzy-search.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';

describe('CoursesComponent', () => {
  let component: CoursesComponent;
  let fixture: ComponentFixture<CoursesComponent>;
  let couchService;
  let getSpy: any;
  let deleteSpy: any;
  let de;
  let coursedata1;
  let coursedata2;
  let coursearray;

  const coursesServiceMock = {
    requestCourses: vi.fn(),
    coursesListener$: vi.fn().mockReturnValue(of([])),
    courseAdmissionMany: vi.fn().mockReturnValue(of({})),
    courseResignAdmission: vi.fn().mockReturnValue(of({})),
    getCourseNameFromId: vi.fn((id) => `Course ${id}`)
  };
  const dialogRefMock = { close: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue(dialogRefMock) };

  const dialogsListServiceMock = {
    getListAndColumns: vi.fn().mockReturnValue(of({ tableData: [], columns: [] }))
  };

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn(),
    closeDialogsForm: vi.fn(),
    showErrorMessage: vi.fn()
  };

  const stateServiceMock = {
    configuration: { planetType: 'nation', code: 'planet_code', parentCode: 'earth', parentDomain: 'parent.domain' },
    couchStateListener: vi.fn().mockReturnValue(of([]))
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue({ isUserAdmin: true, name: 'user' }),
    shelf: { courseIds: [] },
    shelfChange$: new Subject(),
    countInShelf: vi.fn().mockReturnValue({ inShelf: 0, notInShelf: 0 })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    userServiceMock.shelf = { courseIds: [ '1' ] };
    TestBed.configureTestingModule({
      imports: [
        CoursesComponent, FormErrorMessagesComponent
      ],
      providers: [
        CouchService,
        { provide: DialogsListService, useValue: dialogsListServiceMock },
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: CoursesService, useValue: coursesServiceMock },
        PlanetMessageService,
        { provide: UserService, useValue: userServiceMock },
        { provide: SyncService, useValue: { getReplicationState: vi.fn().mockReturnValue(of({})) } },
        { provide: StateService, useValue: stateServiceMock },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        { provide: DialogGuardService, useValue: { open: vi.fn() } },
        { provide: TagsService, useValue: { updateManyTags: vi.fn().mockReturnValue(of({})) } },
        { provide: SearchService, useValue: { recordSearch: vi.fn() } },
        DeviceInfoService,
        FuzzySearchService,
        { provide: MatDialog, useValue: dialogMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { parent: {}, myCourses: false },
              paramMap: { get: () => null }
            },
            paramMap: of({ get: () => null })
          }
        },
        provideHttpClient(withInterceptorsFromDi())
      ]
    });
    fixture = TestBed.createComponent(CoursesComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    couchService = fixture.debugElement.injector.get(CouchService);
    coursedata1 = {
      _id: '1', _rev: 'd5857e866c', doc: { title: 'OLE Test 1', description: 'English Language Test', createdDate: 1, steps: [] }
    };
    coursedata2 = { _id: '2', _rev: '66756fa21', doc: { title: 'Git Quiz', description: 'Git Operation Test', createdDate: 2, steps: [] } };
    coursearray = { rows: [ { doc: coursedata1.doc }, { doc: coursedata2.doc } ] };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('creates a single-course leave request only after confirmation', () => {
    component.courseToggle('1', 'resign');

    const dialogData = dialogMock.open.mock.calls[0][1].data;
    expect(dialogData.displayName).toBe('Course 1');
    expect(coursesServiceMock.getCourseNameFromId).toHaveBeenCalledWith('1', component.parent);
    expect(coursesServiceMock.courseResignAdmission).not.toHaveBeenCalled();

    dialogData.okClick.request.subscribe();

    expect(coursesServiceMock.courseResignAdmission).toHaveBeenCalledWith('1', 'resign', 'Course 1');
  });

  it('confirms bulk removal for enrolled selections only', () => {
    component.courses.data = [
      { _id: '1', doc: { steps: [] } },
      { _id: '2', doc: { steps: [ {} ] } }
    ];

    component.enrollLeaveToggle([ '1', '2' ], 'remove');

    const dialogData = dialogMock.open.mock.calls[0][1].data;
    expect(dialogData.amount).toBe('single');
    expect(dialogData.count).toBe(1);
    expect(dialogData.displayName).toBe('Course 1');
    expect(coursesServiceMock.courseAdmissionMany).not.toHaveBeenCalled();

    dialogData.okClick.request.subscribe();

    expect(coursesServiceMock.courseAdmissionMany).toHaveBeenCalledWith([ '1' ], 'remove', component.parent);
  });

  it('uses the parent catalog when enrolling in a parent course', () => {
    component.parent = true;
    component.courses.data = [ { _id: '1', doc: { steps: [ {} ] } } ];

    component.enrollLeaveToggle([ '1' ], 'add');

    expect(coursesServiceMock.courseAdmissionMany).toHaveBeenCalledWith([ '1' ], 'add', true);
  });

  it('reassigns the course table when the shelf changes', () => {
    component.courses.data = [ { _id: '1', doc: {} } ];
    const previousData = component.courses.data;

    userServiceMock.shelf = { courseIds: [ '1' ] };
    userServiceMock.shelfChange$.next(userServiceMock.shelf);

    expect(component.courses.data).not.toBe(previousData);
    expect(component.courses.data[0].admission).toBe(true);
  });

  // TODO: Update tests to use vitest spies
  // test getCourses()
  /*
  it('should make a get request to couchService', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(of(coursedata1).map).and.callThrough();
    component.getCourses();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(getSpy).toHaveBeenCalledWith('courses/_all_docs?include_docs=true');
    });
  });

  // test ngAfterViewInit()
  it('should ngAfterViewInit', () => {
    component.ngAfterViewInit();
    expect(component.courses.sort).toEqual(component.sort);
    expect(component.courses.paginator).toEqual(component.paginator);
  });

  // searchFilter()
  it('should searchFilter', () => {
    component.searchFilter('OLE');
    expect(component.courses.filter).toEqual('OLE'.trim().toLowerCase());
  });

  // deleteCourse()

  it('should make a delete request to couchService', () => {
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(deleteSpy).toHaveBeenCalledWith('courses/' + coursedata1._id + '?rev=' + coursedata1._rev);
    });
  });

  it('should deleteCourse', () => {
    deleteSpy = spyOn(couchService, 'delete').and.returnValue(of(coursearray));
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.courses.data).toBe(component.courses.data.filter((coursedata1)));
    });
  });

  it('should show There was an error message deleting course', () => {
    deleteSpy = spyOn(couchService, 'delete').and.returnValue(Rx.Observable.throw({ Error }));
    component.deleteCourse(coursedata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.deleteDialog.componentInstance.message).toBe('There was a problem deleting this course');
    });
  });*/
});
