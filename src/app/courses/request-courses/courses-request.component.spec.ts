import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursesRequestComponent } from './courses-request.component';
import { of } from 'rxjs/observable/of';

describe('CoursesComponent', () => {
  let component: CoursesRequestComponent;
  let fixture: ComponentFixture<CoursesRequestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CoursesRequestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
