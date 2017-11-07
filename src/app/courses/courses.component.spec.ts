import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CoursesComponent } from './courses.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpModule } from '@angular/http';
import { CourseValidatorService } from '../validators/course-validator.service';

describe('CoursesComponent', () => {
  let component: CoursesComponent;
  let fixture: ComponentFixture<CoursesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, RouterTestingModule, HttpModule ],
      declarations: [ CoursesComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, CourseValidatorService ]

    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
