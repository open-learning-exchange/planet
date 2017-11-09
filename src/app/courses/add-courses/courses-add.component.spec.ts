import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesAddComponent } from './courses-add.component';
import { FormErrorMessagesComponent } from 'app/shared/form-error-messages.component';
import { CourseValidatorService } from 'app/validators/course-validator.service';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from 'app/shared/couchdb.service';
import { HttpModule } from '@angular/http';

describe('CoursesComponent', () => {
  let component: CoursesAddComponent;
  let fixture: ComponentFixture<CoursesAddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, RouterTestingModule, HttpModule ],
      declarations: [ CoursesAddComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, CourseValidatorService ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
