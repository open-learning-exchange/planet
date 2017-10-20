import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursesrequestComponent } from './coursesrequest.component';

describe('CoursesComponent', () => {
  let component: CoursesrequestComponent;
  let fixture: ComponentFixture<CoursesrequestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CoursesrequestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesrequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
