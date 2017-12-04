import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NavigationComponent } from './navigation.component';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

describe('Navigation', () => {

  let couchSpy: any;
  let routerSpy: any;

  class RouterStub {
    navigate(url: string) { return url; }
  }

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, CommonModule, HttpClientModule ],
      declarations: [ NavigationComponent ],
      providers: [
        CouchService,
        { provide: Router, useClass: RouterStub }
      ]
    });
    const fixture = TestBed.createComponent(NavigationComponent),
      logoutButton = fixture.debugElement.query(By.css('.km-logout')).nativeElement,
      comp = fixture.componentInstance,
      couchService = fixture.debugElement.injector.get(CouchService),
      router = fixture.debugElement.injector.get(Router);
    return { fixture, comp, logoutButton, couchService, router };
  };

  it('Should be a NavigationComponent', () => {
    const { comp } = setup();
    expect(comp instanceof NavigationComponent).toBe(true, 'Should create NavigationComponent');
  });

  describe('Logout button', () => {

    const setupLogin = (returnValue: {ok: boolean}) => {
      const { comp, fixture, logoutButton, couchService, router } = setup();
      couchSpy = spyOn(couchService, 'delete').and.returnValue(Promise.resolve(returnValue));
      routerSpy = spyOn(router, 'navigate');
      logoutButton.click();
      return { comp, fixture, logoutButton, couchService, router };
    };

    it('Should call CouchService delete to logout', () => {
      const { logoutButton, fixture } = setupLogin({ ok: true });
      expect(couchSpy).toHaveBeenCalled();
    });

    it('Should redirect when logout succeeds', () => {
      const { logoutButton, fixture } = setupLogin({ ok: true });
      fixture.whenStable().then(() => {
        expect(routerSpy).toHaveBeenCalled();
      });
    });

    it('Should not redirect when logout fails', () => {
      const { logoutButton, fixture } = setupLogin({ ok: false });
      fixture.whenStable().then(() => {
        expect(routerSpy).not.toHaveBeenCalled();
      });
    });
  });

});
