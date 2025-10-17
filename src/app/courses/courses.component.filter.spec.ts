import { CoursesComponent } from './courses.component';
import { Subject, of } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { DeviceType } from '../shared/device-info.service';

class MockCouchService {
  localComparison() { return of([]); }
  checkAuthorization() { return of(true); }
  delete() { return of({}); }
  put() { return of({ rev: '1' }); }
}

class MockCoursesService {
  private courses$ = new Subject<any>();

  coursesListener$() {
    return this.courses$.asObservable();
  }

  emitCourses(value: any) {
    this.courses$.next(value);
  }

  requestCourses() {}

  courseAdmissionMany() {
    return of(null);
  }
}

class MockMatDialog {
  open() {
    return { afterClosed: () => of(null) } as any;
  }
}

class MockDialogsListService {}

class MockPlanetMessageService {
  showMessage() {}
  showAlert() {}
}

class MockRouter {
  navigate() {}
}

class MockActivatedRoute {
  snapshot = {
    data: { parent: false, myCourses: true },
    paramMap: { get: () => null }
  };
}

class MockUserService {
  shelfChange$ = new Subject<any>();
  shelf = { courseIds: [] as string[] };
  private user = { isUserAdmin: false, name: 'tester' };

  get() {
    return this.user;
  }

  countInShelf(selected: string[]) {
    const inShelf = selected.filter((id) => this.shelf.courseIds.includes(id)).length;
    return { inShelf, notInShelf: selected.length - inShelf };
  }
}

class MockSyncService {}

class MockStateService {
  configuration = {
    planetType: 'earth',
    parentDomain: '',
    code: 'test',
    parentCode: 'earth'
  };
}

class MockDialogsLoadingService {
  start() {}
  stop() {}
}

class MockTagsService {}

class MockSearchService {
  recordSearch() {}
}

class MockDeviceInfoService {
  getDeviceType() {
    return DeviceType.Desktop;
  }
}

class MockFuzzySearchService {
  fuzzyWordMatch() {
    return false;
  }
}

describe('CoursesComponent course filtering', () => {
  let component: CoursesComponent;
  let coursesService: MockCoursesService;
  let userService: MockUserService;

  beforeEach(() => {
    const couchService = new MockCouchService();
    coursesService = new MockCoursesService();
    const dialog = new MockMatDialog();
    const dialogsListService = new MockDialogsListService();
    const planetMessageService = new MockPlanetMessageService();
    const router = new MockRouter() as any;
    const route = new MockActivatedRoute() as any;
    userService = new MockUserService();
    const syncService = new MockSyncService() as any;
    const stateService = new MockStateService() as any;
    const dialogsLoadingService = new MockDialogsLoadingService();
    const tagsService = new MockTagsService() as any;
    const searchService = new MockSearchService() as any;
    const deviceInfoService = new MockDeviceInfoService();
    const fuzzySearchService = new MockFuzzySearchService() as any;

    component = new CoursesComponent(
      couchService as any,
      coursesService as any,
      dialog as any,
      dialogsListService as any,
      planetMessageService as any,
      router,
      route,
      userService as any,
      syncService,
      stateService,
      dialogsLoadingService as any,
      tagsService,
      searchService,
      deviceInfoService as any,
      fuzzySearchService
    );

    component.ngOnInit();
  });

  it('includes admitted courses immediately when their collection filter is active', () => {
    const admittedCourse = {
      _id: 'course-admitted',
      doc: {
        createdDate: 2,
        courseTitle: 'Admitted Course',
        steps: [ {} ],
        sourcePlanet: 'test',
        tags: []
      },
      tags: [ { _id: 'collection-1' } ]
    };

    const otherCourse = {
      _id: 'course-other',
      doc: {
        createdDate: 1,
        courseTitle: 'Other Course',
        steps: [ {} ],
        sourcePlanet: 'remote',
        tags: []
      },
      tags: [ { _id: 'collection-1' } ]
    };

    userService.shelf.courseIds = [ admittedCourse._id ];
    component.selection = new SelectionModel(true, []);
    component.selection.select(admittedCourse._id);
    component.selection.select(otherCourse._id);

    component.tagFilter.setValue([ 'collection-1' ]);
    coursesService.emitCourses([ admittedCourse, otherCourse ]);

    component.removeFilteredFromSelection();
    component.countSelectNotEnrolled(component.selection.selected);

    const filteredIds = component.courses.filteredData.map((course: any) => course._id);
    expect(filteredIds).toEqual([ admittedCourse._id ]);
    expect(component.selection.selected).toEqual([ admittedCourse._id ]);
    expect(component.selectedEnrolled).toBe(1);
    expect(component.selectedNotEnrolled).toBe(0);
  });
});
