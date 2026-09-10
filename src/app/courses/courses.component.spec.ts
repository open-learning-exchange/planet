import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { CoursesComponent } from './courses.component';
import { CouchService } from '../shared/couchdb.service';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { CoursesService } from './courses.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { SyncService } from '../shared/sync.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogGuardService } from '../shared/dialogs/dialog-guard.service';
import { TagsService } from '../shared/forms/tags.service';
import { SearchService } from '../shared/forms/search.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { FuzzySearchService } from '../shared/fuzzy-search.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';

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
        { provide: TagsService, useValue: { updateManyTags: vi.fn().mockReturnValue(of({})), getTags: vi.fn().mockReturnValue(of([])) } },
        { provide: SearchService, useValue: { recordSearch: vi.fn() } },
        DeviceInfoService,
        FuzzySearchService,
        { provide: Router, useValue: { navigate: vi.fn(), url: '/courses' } },
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
    expect(component.enrolledCount).toBe(1);
    expect(component.availableCount).toBe(0);
  });

  describe('enrollment filter toggle', () => {
    it('defaults enrollmentFilterState to all when myCourses route data is false', () => {
      expect(component.enrollmentFilterState.value).toBe('all');
    });

    it('updates enrollmentFilterState and triggers filter when onEnrollmentFilterChange is called', () => {
      component.onEnrollmentFilterChange('enrolled');
      expect(component.enrollmentFilterState.value).toBe('enrolled');
      expect(component.courses.filter).toBe(' ');

      component.onEnrollmentFilterChange('available');
      expect(component.enrollmentFilterState.value).toBe('available');
      expect(component.courses.filter).toBe(' ');

      component.onEnrollmentFilterChange('all');
      expect(component.enrollmentFilterState.value).toBe('all');
      expect(component.courses.filter).toBe('');
    });

    it('correctly filters rows according to enrollment status in filterPredicate', () => {
      const enrolledCourse = { _id: '1', admission: true, tags: [], doc: { courseTitle: 'Math 101' } };
      const availableCourse = { _id: '2', admission: false, tags: [], doc: { courseTitle: 'Science 101' } };

      component.enrollmentFilterState.value = 'all';
      expect(component.filterPredicate(enrolledCourse, '')).toBe(true);
      expect(component.filterPredicate(availableCourse, '')).toBe(true);

      component.enrollmentFilterState.value = 'enrolled';
      expect(component.filterPredicate(enrolledCourse, ' ')).toBe(true);
      expect(component.filterPredicate(availableCourse, ' ')).toBe(false);

      component.enrollmentFilterState.value = 'available';
      expect(component.filterPredicate(enrolledCourse, ' ')).toBe(false);
      expect(component.filterPredicate(availableCourse, ' ')).toBe(true);
    });

    it('updates enrolledCount and availableCount dynamically', () => {
      component.courses.data = [
        { _id: '1', admission: true, doc: {} },
        { _id: '2', admission: false, doc: {} },
        { _id: '3', admission: true, doc: {} },
        { _id: '4', admission: false, doc: {} },
        { _id: '5', admission: false, doc: {} }
      ];

      component.updateEnrollmentCounts();

      expect(component.enrolledCount).toBe(2);
      expect(component.availableCount).toBe(3);
    });

    it('resets enrollmentFilterState to all when resetFilter is called on standard courses view', () => {
      component.enrollmentFilterState.value = 'enrolled';
      component.resetFilter();

      expect(component.enrollmentFilterState.value).toBe('all');
    });

    it('preserves enrolled filter state on resetFilter when on myCourses route', () => {
      component['route'].snapshot.data.myCourses = true;
      component.enrollmentFilterState.value = 'enrolled';

      component.resetFilter();

      expect(component.enrollmentFilterState.value).toBe('enrolled');
    });

    it('clears unmatching selections when switching enrollment filter', async () => {
      component.courses.data = [
        { _id: '1', admission: true, doc: {} },
        { _id: '2', admission: false, doc: {} }
      ];
      component.selection.select('1');
      component.selection.select('2');
      expect(component.selection.selected).toEqual([ '1', '2' ]);

      component.onEnrollmentFilterChange('enrolled');

      await new Promise(resolve => queueMicrotask(resolve));
      expect(component.enrollmentFilterState.value).toBe('enrolled');
    });
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
