import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';

import { MeetupsViewComponent } from './meetups-view.component';

// describe('ViewMeetupsComponent', () => {
//   let component: MeetupsViewComponent;
//   let fixture: ComponentFixture<MeetupsViewComponent>;

//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       imports: [MeetupsViewComponent],
//       providers: [{ provide: HttpClient, useValue: HttpTestingController}]
//     }).compileComponents();
//   }));

//   beforeEach(() => {
//     fixture = TestBed.createComponent(MeetupsViewComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
