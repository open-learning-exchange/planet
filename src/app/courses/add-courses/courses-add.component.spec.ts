import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesAddComponent } from './courses-add.component';
import { FormErrorMessagesComponent } from '../../shared/forms/form-error-messages.component';
import { ValidatorService } from '../../validators/validator.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { NavigationService } from '../../shared/navigation.service';
import { MaterialModule } from '../../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('CoursesAddComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;
  let couchService;
  let testCourseForm;
  let de;
  let postSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, RouterTestingModule.withRoutes([
        { path: 'courses', component: CoursesAddComponent }
      ]), MaterialModule, BrowserAnimationsModule, CoursesAddComponent, FormErrorMessagesComponent],
      providers: [
        CouchService,
        ValidatorService,
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => undefined },
              params: {},
              url: [ { path: 'add' } ]
            }
          }
        },
        {
          provide: Router,
          useValue: {
            url: '/courses/add',
            createUrlTree: vi.fn().mockReturnValue({}),
            serializeUrl: vi.fn().mockReturnValue('/courses/add;continue=true'),
            navigate: vi.fn()
          }
        },
        { provide: NavigationService, useValue: { back: vi.fn() } }
      ]
    });
    fixture = TestBed.createComponent(CoursesAddComponent);
    component = fixture.componentInstance;
    couchService = fixture.debugElement.injector.get(CouchService);
    de = fixture.debugElement;
    postSpy = fixture.debugElement.injector.get(CouchService);
    testCourseForm = { courseTitle: 'OLE Test 1', description: 'First test for VIs' };

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // test createForm()
  it('should createForm', () => {
    expect(component.createForm()).toBe(undefined);
  });

  // test onSubmit()
  it('should onSubmit', () => {
    component.onSubmit();
    expect(component.courseForm.controls.courseTitle.hasError('required')).toBe(true);
  });

  // test addCourse()
  // it('should make a post request to CouchDB', () => {
  //   postSpy = spyOn(couchService, 'post').and.returnValue(of({ ...testCourseForm }));
  //   component.addCourse(testCourseForm);
  //   fixture.detectChanges();
  //   fixture.whenStable().then(() => {
  //     expect(postSpy).toHaveBeenCalled();
  //   });
  // });

  // test cancel()
  it('should cancel by unwinding history with the list route as fallback', () => {
    const route = fixture.debugElement.injector.get(ActivatedRoute);
    const navigationService = fixture.debugElement.injector.get(NavigationService);
    component.cancel();
    expect(navigationService.back).toHaveBeenCalledWith([ '../' ], { relativeTo: route });
  });

  it('should compute the fallback depth from route segments, ignoring matrix params', () => {
    const route: any = fixture.debugElement.injector.get(ActivatedRoute);
    const navigationService = fixture.debugElement.injector.get(NavigationService);
    // update/:id form reached back from the exam editor: URL ends in ;continue=true
    route.snapshot.url = [ { path: 'update', parameters: { continue: 'true' } }, { path: 'abc123' } ];
    component.navigateBack();
    expect(navigationService.back).toHaveBeenLastCalledWith([ '../../' ], { relativeTo: route });
    // view/:id/update form is only one level above the course detail
    route.snapshot.url = [ { path: 'view' }, { path: 'abc123' }, { path: 'update' } ];
    component.navigateBack();
    expect(navigationService.back).toHaveBeenLastCalledWith([ '../' ], { relativeTo: route });
  });

  // test onDayChange()
  // it('should onDayChange', () => {
  //   expect(component.onDayChange('Monday', true)).toBe(undefined);
  // });

  // test toogleWeekly()
  // it('should toogleDaily', () => {
  //   component.toggleDaily(false);
  //   fixture.whenStable().then(() => {
  //     fixture.detectChanges();
  //     expect(component.showDaysCheckBox).toBe(false);
  //   });
  // });
});
