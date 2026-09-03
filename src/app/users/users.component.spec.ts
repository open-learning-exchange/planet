
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { MaterialModule } from '../shared/material.module';
import { UsersComponent } from './users.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { of, throwError } from 'rxjs';

describe('Users', () => {

  const setup = () => {
    const configurationService = { patchLocalConfiguration: vi.fn(() => of({})) };
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), FormsModule, CommonModule, MaterialModule, BrowserAnimationsModule, UsersComponent],
      providers: [
        CouchService,
        UserService,
        { provide: ConfigurationService, useValue: configurationService },
        provideHttpClient(withInterceptorsFromDi())
      ]
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
    return { fixture, comp, couchService, userService, configurationService, testUsers };
  };

  it('Should be a UsersComponent', () => {
    const { comp } = setup();
    expect(comp instanceof UsersComponent).toBe(true, 'Should create UsersComponent');
  });

  describe('Extra columns', () => {

    it('Should show configured extra columns after the name column', () => {
      const { comp } = setup();
      comp['setExtraColumns']([ 'email', 'phoneNumber' ]);
      expect(comp.displayedColumns).toEqual(
        [ 'profile', 'name', 'email', 'phoneNumber', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ]
      );
    });

    it('Should drop column names the table has no definition for', () => {
      const { comp } = setup();
      comp['setExtraColumns']([ 'email', 'password_scheme', 'derived_key' ]);
      expect(comp.extraColumns).toEqual([ 'email' ]);
    });

    it('Should ignore a configuration value which is not an array', () => {
      const { comp } = setup();
      comp['setExtraColumns']('email');
      expect(comp.extraColumns).toEqual([]);
    });

    it('Should leave the associated planets view unchanged', () => {
      const { comp } = setup();
      comp['setExtraColumns']([ 'email' ]);
      comp.filterDisplayColumns('associated');
      expect(comp.displayedColumns).toEqual([ 'profile', 'name', 'joinDate', 'lastLogin', 'action' ]);
    });

    it('Should save the selection to the local configuration', () => {
      const { comp, configurationService } = setup();
      comp.extraColumns = [ 'email', 'gender' ];
      comp.saveExtraColumns();
      expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({ userTableColumns: [ 'email', 'gender' ] });
    });

    it('Should not write to the configuration when the selection is unchanged', () => {
      const { comp, configurationService } = setup();
      comp['setExtraColumns']([ 'email' ]);
      comp.saveExtraColumns();
      expect(configurationService.patchLocalConfiguration).not.toHaveBeenCalled();
    });

    it('Should render the column picker for an admin and hide it for everyone else', () => {
      const { fixture, comp, userService } = setup();
      vi.spyOn(userService, 'get').mockReturnValue({ isUserAdmin: true, name: 'admin' } as any);
      comp.ngOnInit();
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.km-extra-columns'))).toBeTruthy();

      comp.isUserAdmin = false;
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.km-extra-columns'))).toBeNull();
    });

    it('Should keep the columns selected in the table when the save fails', () => {
      const { comp, configurationService } = setup();
      configurationService.patchLocalConfiguration.mockReturnValue(throwError(() => new Error('offline')));
      comp.extraColumns = [ 'email' ];
      comp.saveExtraColumns();
      expect(comp.extraColumns).toEqual([ 'email' ]);
    });

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
