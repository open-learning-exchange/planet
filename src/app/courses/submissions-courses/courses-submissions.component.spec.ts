import { ComponentFixture, TestBed } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';

import { CoursesSubmissionsComponent } from './courses-submissions.component';
import { CoursesService } from '../courses.service';
import { UserService } from '../../shared/user.service';
import { DeviceInfoService } from '../../shared/device-info.service';

describe('CoursesSubmissionsComponent', () => {
  let component: CoursesSubmissionsComponent;
  let fixture: ComponentFixture<CoursesSubmissionsComponent>;

  const courseUpdated$ = new Subject<any>();

  const coursesServiceMock = {
    requestCourse: jasmine.createSpy('requestCourse'),
    courseUpdated$: courseUpdated$.asObservable()
  };

  const userServiceMock = {
    get: () => ({ isUserAdmin: true, name: 'admin' })
  };

  const deviceInfoServiceMock = {
    watchDeviceType: () => of('desktop'),
    getDeviceType: () => 'desktop'
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CoursesSubmissionsComponent,
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CoursesService, useValue: coursesServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: DeviceInfoService, useValue: deviceInfoServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'course_123' })),
            snapshot: { paramMap: convertToParamMap({ id: 'course_123' }), data: {} }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoursesSubmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should request course details on init', () => {
    expect(coursesServiceMock.requestCourse).toHaveBeenCalledWith({ courseId: 'course_123', forceLatest: true });
  });

  it('should update course title and manage status when courseUpdated$ fires', () => {
    courseUpdated$.next({
      course: { _id: 'course_123', courseTitle: 'Test Math Course', creator: 'admin@ole' }
    });
    fixture.detectChanges();
    expect(component.headingStart).toBe('Test Math Course');
    expect(component.canManage).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  it('should navigate back to /courses when navigateBack is called', () => {
    component.navigateBack();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });
});
