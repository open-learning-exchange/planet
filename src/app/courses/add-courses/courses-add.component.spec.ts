import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesAddComponent } from './courses-add.component';
import { FormErrorMessagesComponent } from '../../shared/form-error-messages.component';
import { ValidatorService } from '../../validators/validator.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../../shared/couchdb.service';
import { MaterialModule } from '../../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { of } from 'rxjs/observable/of';

describe('CoursesAddComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;
  let couchService;
  let testCourseForm;
  let de;
  let postSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, RouterTestingModule.withRoutes([
        { path: 'courses', component: CoursesAddComponent } ]), HttpClientModule, MaterialModule, BrowserAnimationsModule ],
      declarations: [ CoursesAddComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, ValidatorService ],
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
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      const errorMessage = de.nativeElement.querySelector('.km-coursetitle-errormessage span');
      expect(errorMessage.textContent).toBe('This field is required');
    });
  });

  // test addCourse()
  it('should make a post request to CouchDB', () => {
    postSpy = spyOn(couchService, 'post').and.returnValue(of({ ...testCourseForm }));
    component.addCourse(testCourseForm);
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(postSpy).toHaveBeenCalled();
    });
  });

  // test cancel()
  it('should cancel', () => {
    expect(component.cancel()).toBe(undefined);
  });

  // test onDayChange()
  it('should onDayChange', () => {
      expect(component.onDayChange('Monday', true)).toBe(undefined);
  });

  // test toogleWeekly()
  it('should toogleDaily', () => {
    component.toggleDaily(false);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.showDaysCheckBox).toBe(false);
    });
  });
});
