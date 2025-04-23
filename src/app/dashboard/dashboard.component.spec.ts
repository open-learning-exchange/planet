import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { UserService } from '../shared/user.service';
import { of } from 'rxjs/observable/of';

describe('Dashboard', () => {

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, HttpClientModule ],
      declarations: [ DashboardComponent ],
      providers: [ UserService, CouchService ]
    });
    const fixture = TestBed.createComponent(DashboardComponent),
      comp = fixture.componentInstance,
      de = fixture.debugElement.query(By.css('#greeting')),
      greetElement = de.nativeElement;
    return { fixture, comp, de, greetElement };
  };

  it('Should be a DashboardComponent', () => {
    const { comp } = setup();
    expect(comp instanceof DashboardComponent).toBe(true, 'Should create AppComponent');
  });
  /*
  it('Should display the correct title', () => {
    const { fixture, comp, greetElement } = setup();
    comp.name = 'paul';
    fixture.detectChanges();
    expect(greetElement.textContent).toBe('Hi, paul', 'Greeting displays correctly');
  });
  */
});
