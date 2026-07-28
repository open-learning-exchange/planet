import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';

import { CoursesViewComponent } from './courses-view.component';

// describe('ViewCoursesComponent', () => {
//   let component: CoursesViewComponent;
//   let fixture: ComponentFixture<CoursesViewComponent>;

//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       imports: [CoursesViewComponent],
//       providers: [{ provide: HttpClient, useValue: HttpTestingController}]
//     }).compileComponents();
//   }));

//   beforeEach(() => {
//     fixture = TestBed.createComponent(CoursesViewComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
