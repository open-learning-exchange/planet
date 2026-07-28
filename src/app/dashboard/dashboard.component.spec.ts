import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClient } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { UserService } from '../shared/user.service';

// describe('Dashboard', () => {

//   const setup = () => {
//     TestBed.configureTestingModule({
//       imports: [RouterTestingModule, DashboardComponent],
//       providers: [UserService, CouchService, { provide: HttpClient, useValue: HttpTestingController}]
//     });
//     const fixture = TestBed.createComponent(DashboardComponent),
//       comp = fixture.componentInstance,
//       de = fixture.debugElement.query(By.css('#greeting')),
//       greetElement = de.nativeElement;
//     return { fixture, comp, de, greetElement };
//   };

//   it('Should be a DashboardComponent', () => {
//     const { comp } = setup();
//     expect(comp instanceof DashboardComponent).toBe(true, 'Should create AppComponent');
//   });
//   /*
//   it('Should display the correct title', () => {
//     const { fixture, comp, greetElement } = setup();
//     comp.name = 'paul';
//     fixture.detectChanges();
//     expect(greetElement.textContent).toBe('Hi, paul', 'Greeting displays correctly');
//   });
//   */
// });
