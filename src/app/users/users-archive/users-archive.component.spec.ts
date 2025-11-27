import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';

import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { UsersArchiveComponent } from './users-archive.component';

class MockCouchService {
  get = jasmine.createSpy().and.returnValue(of({
    _id: 'org.couchdb.user:test-user',
    name: 'test-user',
    roles: []
  }));
}

class MockUserService {
  updateUser = jasmine.createSpy();
  setUserLogout = jasmine.createSpy();
  get = jasmine.createSpy().and.returnValue({ name: 'test-user' });
}

describe('UsersArchiveComponent', () => {
  let component: UsersArchiveComponent;
  let fixture: ComponentFixture<UsersArchiveComponent>;
  let userService: MockUserService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule ],
      declarations: [ UsersArchiveComponent ],
      providers: [
        { provide: CouchService, useClass: MockCouchService },
        { provide: UserService, useClass: MockUserService }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersArchiveComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as any;
    fixture.detectChanges();
  });

  it('archives the user with the provided reason and toggles the spinner after success', () => {
    const updateSubject = new Subject<any>();
    userService.updateUser.and.returnValue(updateSubject);
    component.archiveForm.get('description').setValue('Please archive me');

    component.onSubmit();

    expect(component.spinnerOn).toBeTrue();
    expect(userService.updateUser).toHaveBeenCalledWith(jasmine.objectContaining({
      isArchived: true,
      archiveReason: 'Please archive me'
    }));

    updateSubject.next({});
    updateSubject.complete();

    expect(userService.setUserLogout).toHaveBeenCalled();
    expect(component.spinnerOn).toBeFalse();
  });

  it('stops the spinner if archiving fails', () => {
    const updateSubject = new Subject<any>();
    userService.updateUser.and.returnValue(updateSubject);
    component.archiveForm.get('description').setValue('Failure reason');

    component.onSubmit();
    updateSubject.error('nope');

    expect(userService.setUserLogout).not.toHaveBeenCalled();
    expect(component.spinnerOn).toBeFalse();
  });
});
