import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursesRequestComponent } from './courses-request.component';
import { of } from 'rxjs/observable/of';

describe('CoursesRequestComponent', () => {
  let component: CoursesRequestComponent;
  let fixture: ComponentFixture<CoursesRequestComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      declarations: [ CoursesRequestComponent ]
    });
    fixture = TestBed.createComponent(CoursesRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
