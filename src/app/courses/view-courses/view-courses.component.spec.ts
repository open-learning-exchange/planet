import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCoursesComponent } from './view-courses.component';

describe('ViewCoursesComponent', () => {
  let component: ViewCoursesComponent;
  let fixture: ComponentFixture<ViewCoursesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ViewCoursesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
