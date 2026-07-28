import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';

import { NotificationsComponent } from './notifications.component';

// describe('NotificationsComponent', () => {
//   let component: NotificationsComponent;
//   let fixture: ComponentFixture<NotificationsComponent>;

//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       imports: [NotificationsComponent],
//       providers: [{ provide: HttpClient, useValue: HttpTestingController}]
//     }).compileComponents();
//   }));

//   beforeEach(() => {
//     fixture = TestBed.createComponent(NotificationsComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
