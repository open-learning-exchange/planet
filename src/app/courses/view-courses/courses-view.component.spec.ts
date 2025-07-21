import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CoursesViewComponent } from './courses-view.component';

describe('ViewCoursesComponent', () => {
  let component: CoursesViewComponent;
  let fixture: ComponentFixture<CoursesViewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CoursesViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
