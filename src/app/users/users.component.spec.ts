
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { afterEach, vi } from 'vitest';
import { MaterialModule } from '../shared/material.module';
import { UsersComponent } from './users.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { NEVER, of } from 'rxjs';

describe('Users', () => {

  afterEach(() => vi.useRealTimers());

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), FormsModule, CommonModule, MaterialModule, BrowserAnimationsModule, UsersComponent],
      providers: [CouchService, UserService, provideHttpClient(withInterceptorsFromDi())]
    });
    const fixture = TestBed.createComponent(UsersComponent);
    const comp = fixture.componentInstance;
    // let de = fixture.debugElement.query(By.css('#login-status'));
    // let statusElement = de.nativeElement;
    const couchService = fixture.debugElement.injector.get(CouchService);
    const userService = fixture.debugElement.injector.get(UserService);
    const testUsers: any = {
      users: { rows: [
        { doc: { name: 'Test1', _id: 'Test1', roles: [ 'test' ] } },
        { doc: { name: 'Test2', _id: 'Test2', roles: [ ] } }
      ] },
      admins: { testAdmin: 1 }
    };
    return { fixture, comp, couchService, userService, testUsers };
  };

  it('Should be a UsersComponent', () => {
    const { comp } = setup();
    expect(comp instanceof UsersComponent).toBe(true, 'Should create UsersComponent');
  });

  it('replaces debounced search state instead of adding browser history entries', () => {
    vi.useFakeTimers();
    const router = { navigate: vi.fn() };
    const route = { queryParamMap: NEVER };
    const component = new UsersComponent(
      { shelf: {}, get: vi.fn(() => ({ isUserAdmin: true })) } as any,
      router as any,
      route as any,
      {} as any,
      { configuration: { planetType: 'community' } } as any,
      { start: vi.fn(), stop: vi.fn() } as any,
      { getChildPlanets: vi.fn(() => NEVER) } as any,
      { usersListener: vi.fn(() => NEVER), requestUserData: vi.fn(), roleList: [], allRolesList: [] } as any,
      { watchDeviceType: vi.fn(() => NEVER) } as any,
      {} as any
    );
    component.ngOnInit();

    component.searchChanged('learner');
    vi.advanceTimersByTime(499);

    expect(router.navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { search: 'learner' },
      replaceUrl: true
    });
    component.ngOnDestroy();
  });

  // describe('Init', () => {

  //   it('Should display restricted message for nonadmin', () => {
  //     const { fixture } = setup(),
  //       messageElement = fixture.debugElement.query(By.css('.km-message')).nativeElement;
  //     fixture.whenStable().then(() => {
  //       fixture.detectChanges();
  //       expect(messageElement.textContent).toBe('Access restricted to admins', 'Restricted message displays correctly');
  //     });
  //   });

  //   it('Should display table for admin', () => {
  //     const { fixture, comp, userService } = setup(),
  //       userSpy = vi.spyOn(userService, 'get').mockReturnValue({ roles: [ '_admin' ] });
  //     comp.ngOnInit();
  //     fixture.whenStable().then(() => {
  //       fixture.detectChanges();
  //       const tableElement = fixture.debugElement.query(By.css('.km-user-table')).nativeElement;
  //       expect(tableElement.style.display).not.toBe('none', 'Table is visible');
  //     });
  //   });

  //   it('Should make two GET requests to CouchDB for admin', () => {
  //     const { fixture, comp, userService, couchService } = setup(),
  //       couchSpy = vi.spyOn(couchService, 'get').mockReturnValue(of({ rows: [] }));
  //     comp.ngOnInit();
  //     fixture.whenStable().then(() => {
  //       fixture.detectChanges();
  //       expect(couchSpy).toHaveBeenCalledWith('_users/_all_docs?include_docs=true');
  //       expect(couchSpy).toHaveBeenCalledWith('_node/nonode@nohost/_config/admins');
  //     });
  //   });
  // });

  /*
  it('Should display create user message', () => {
    let { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'put').and.returnValue(Promise.resolve({id:'org.couchdb.user:' + testModel.name}));
    comp.createUser(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('User created: ' + testModel.name,'Create user message displays correctly');
    });
  });

  it('Should reject nonmatching passwords', () => {
    let { fixture, comp, statusElement, couchService, testModel } = setup();
    testModel.repeatPassword = 'passwor';
    comp.createUser(testModel);
    fixture.detectChanges();
    expect(statusElement.textContent).toBe('Passwords do not match','Create user message displays correctly');
  });

  it('Should greet users', () => {
    let { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'post').and.returnValue(Promise.resolve({name:testModel.name}));
    comp.login(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Hi, ' + testModel.name + '!','Create user message displays correctly');
    });
  });

  it('Should message when user & password do not match', () => {
    let { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'post').and.returnValue(Promise.reject({}));
    comp.login(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Username and/or password do not match');
    });
  });
  */
});
