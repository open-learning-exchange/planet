import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesAddComponent } from './courses-add.component';
import { FormErrorMessagesComponent } from '../../shared/form-error-messages.component';
import { CourseValidatorService } from 'app/validators/course-validator.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../../shared/couchdb.service';
import { MaterialModule } from '../../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CoursesComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;
  let couchService;
  // let testCourseForm;
  let statusElement1;
  let statusElement2;
  let statusElement3;
  let de;
  let postSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, RouterTestingModule, HttpClientModule, MaterialModule, BrowserAnimationsModule ],
      declarations: [ CoursesAddComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, CourseValidatorService ]
    });
    fixture = TestBed.createComponent(CoursesAddComponent);
    component = fixture.componentInstance;
    couchService = fixture.debugElement.injector.get(CouchService);
    de = fixture.debugElement;
    statusElement1 = de.nativeElement.querySelector('.km-course-valid');
    statusElement2 = de.nativeElement.querySelector('.km-coursetitle-errormessage');
    statusElement3 = de.nativeElement.querySelector('.km-day');
    postSpy = fixture.debugElement.injector.get(CouchService);
      // testCourseForm ={ courseTitle: 'OLE Test 1', description: 'First test for VIs' };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // test createForm()
  it('should createForm', () => {
    component.createForm();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement1.textContent).toBe('false');
    });
  });

  // test onSubmit()
  it('should onSubmit', () => {
    component.onSubmit();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement2.textContent).toBe('This field is required');
    });
  });

  // test addCourse()
  /*
  it('should make a post request to CouchDB', async(() =>{
    postSpy = spyOn(couchService,'post').and.returnValue(testCourseForm);
    component.addCourse(testCourseForm);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement2.textContent).toBe('Course already exists');
    });
  }));
  */

  // test cancel()
  it('should cancel', () => {
      expect(component.cancel()).toBe(undefined);
 });

  // test onDayChange()
  it('should onDayChange', () => {
    component.onDayChange('Monday', true);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement3.textContent).toBe('Monday');
    });
  });

  // test toogleWeekly()
  it('should toogleWeekly', () => {
    component.toogleWeekly(false);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.showDaysCheckBox).toBe(false);
    });
  });
});
