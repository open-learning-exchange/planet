import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormErrorMessagesComponent } from '../../shared/forms/form-error-messages.component';
import { UsersUpdateComponent } from './users-update.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CouchService } from '../../shared/couchdb.service';
import { MaterialModule } from '../../shared/material.module';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { ValidatorService } from '../../validators/validator.service';
import { MatDialog } from '@angular/material/dialog';

describe('UserUpdateProfileComponent', () => {
  let component: UsersUpdateComponent;
  let fixture: ComponentFixture<UsersUpdateComponent>;
  const couchServiceMock = {
    get: vi.fn().mockReturnValue(of({ name: 'testuser', roles: [] }))
  };
  const userServiceMock = {
    minBirthDate: new Date(1900, 0, 1),
    get: vi.fn().mockReturnValue({ name: 'testuser' }),
    updateUser: vi.fn().mockReturnValue(of({})),
    addImageForReplication: vi.fn().mockReturnValue(of({}))
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule, ReactiveFormsModule, MaterialModule, RouterTestingModule, BrowserAnimationsModule,
        UsersUpdateComponent, FormErrorMessagesComponent, MatIconTestingModule
      ],
      providers: [
        {
          provide: CouchService,
          useValue: couchServiceMock
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              queryParams: {},
              paramMap: { get: () => 'testuser' }
            }
          }
        },
        { provide: UserService, useValue: userServiceMock },
        { provide: StateService, useValue: { configuration: {} } },
        { provide: ValidatorService, useValue: { notDateInFuture$: vi.fn().mockReturnValue(of(null)) } },
        { provide: MatDialog, useValue: { open: vi.fn(), openDialogs: [] } }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(couchServiceMock.get).toHaveBeenCalledWith('_users/org.couchdb.user:testuser');
  });

  it('should map languages array to form value', () => {
    const user = {
      name: 'testuser',
      languages: ['English', 'Spanish'],
      language: 'English'
    };
    const formValue = (component as any).mapUserToFormValue(user);
    expect(formValue.languages).toEqual(['English', 'Spanish']);
  });

  it('should fallback to legacy language string when languages array is not present', () => {
    const user = {
      name: 'testuser',
      language: 'Spanish'
    };
    const formValue = (component as any).mapUserToFormValue(user);
    expect(formValue.languages).toEqual(['Spanish']);
  });

  it('should include languages array and primary language on submitUser', () => {
    component.submissionMode = false;
    component.user = { name: 'testuser' } as any;
    component.editForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      languages: ['English', 'Somali'],
      phoneNumber: '1234567890',
      gender: 'male',
      level: 'level1'
    });

    component.submitUser();

    expect(userServiceMock.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        languages: ['English', 'Somali'],
        language: 'English'
      })
    );
  });
});
