import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MaterialModule } from '../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs';

describe('Home', () => {

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, BrowserAnimationsModule, CommonModule, MaterialModule, HomeComponent],
      providers: [CouchService, UserService, provideHttpClient(withInterceptorsFromDi())]
    });
    const fixture = TestBed.createComponent(HomeComponent),
      comp = fixture.componentInstance,
      router = TestBed.inject(Router);
    return { fixture, comp, router };
  };

  it('Should be a HomeComponent', () => {
    const { comp } = setup();
    expect(comp instanceof HomeComponent).toBe(true, 'Should create HomeComponent');
  });

  it('should auto-close sidenav on NavigationEnd when on mobile', () => {
    const { comp, router } = setup();
    comp.isMobile = true;
    comp.sidenavState = 'open';
    comp.ngOnInit();

    (router.events as Subject<any>).next(new NavigationEnd(1, '/courses', '/courses'));

    expect(comp.sidenavState).toBe('closed');
  });

  it('should keep sidenav state on NavigationEnd when not on mobile', () => {
    const { comp, router } = setup();
    comp.isMobile = false;
    comp.sidenavState = 'open';
    comp.ngOnInit();

    (router.events as Subject<any>).next(new NavigationEnd(1, '/courses', '/courses'));

    expect(comp.sidenavState).toBe('open');
  });

});

