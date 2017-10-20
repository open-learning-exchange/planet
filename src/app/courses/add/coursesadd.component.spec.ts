import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursesaddComponent } from './coursesadd.component';

describe('CoursesComponent', () => {
  let component: CoursesaddComponent;
  let fixture: ComponentFixture<CoursesaddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CoursesaddComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesaddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
