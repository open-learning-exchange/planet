import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesComponent } from './courses.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../shared/material.module';
import { of, Subject } from 'rxjs';
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
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
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
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule, FormsModule, RouterTestingModule, MaterialModule,
        BrowserAnimationsModule, CoursesComponent, FormErrorMessagesComponent
      ],
      providers: [
        CouchService,
        { provide: DialogsListService, useValue: dialogsListServiceMock },
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        {
          provide: CoursesService,
          useValue: {
            requestCourses: vi.fn(),
            coursesListener$: vi.fn().mockReturnValue(of([])),
          }
        },
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
        { provide: MatDialog, useValue: { open: vi.fn() } },
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
    coursedata1 = { _id: '1', _rev: 'd5857e866c', doc: { title: 'OLE Test 1', description: 'English Language Test', createdDate: 1, steps: [] } };
    coursedata2 = { _id: '2', _rev: '66756fa21', doc: { title: 'Git Quiz', description: 'Git Operation Test', createdDate: 2, steps: [] } };
    coursearray = { rows: [ { doc: coursedata1.doc }, { doc: coursedata2.doc } ] };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
