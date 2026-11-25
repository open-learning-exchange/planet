import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { FormErrorMessagesComponent } from '@shared/forms/form-error-messages.component';
import { CouchService } from '@shared/database/couchdb.service';
import { MaterialModule } from '@shared/material.module';
import { UserService } from '@shared/auth/user.service';
import { StateService } from '@shared/state.service';

import { UsersUpdateComponent } from './users-update.component';
import { ValidatorService } from '../../validators/validator.service';

describe('UserUpdateProfileComponent', () => {
  let component: UsersUpdateComponent;
  let fixture: ComponentFixture<UsersUpdateComponent>;
  const couchServiceMock = {
    get: vi.fn().mockReturnValue(of({
      name: 'testuser',
      roles: [],
      _attachments: { img: { content_type: 'image/jpeg', digest: 'md5-current' } }
    }))
  };
  const userServiceMock = {
    minBirthDate: new Date(1900, 0, 1),
    get: vi.fn().mockReturnValue({ name: 'testuser' }),
    updateUser: vi.fn().mockReturnValue(of({})),
    addImageForReplication: vi.fn().mockReturnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(couchServiceMock.get).toHaveBeenCalledWith('_users/org.couchdb.user:testuser');
    expect(component.currentProfileImg).toMatch(/\/_users\/org\.couchdb\.user%3Atestuser\/img\?v=md5-current$/);
  });

  it('always writes profile images under the stable img attachment key', () => {
    expect(component.createAttachmentObj('data:image/webp;base64,avatar-data')).toEqual({
      _attachments: { img: { content_type: 'image/webp', data: 'avatar-data' } }
    });
  });

  it('normalizes legacy gender values before populating the form', () => {
    const formValue = component['mapUserToFormValue']({
      name: 'testuser',
      roles: [],
      gender: ' Female '
    });

    expect(formValue.gender).toBe('female');
  });

  it('leaves unsupported gender values unselected', () => {
    const formValue = component['mapUserToFormValue']({
      name: 'testuser',
      roles: [],
      gender: 'unknown'
    });

    expect(formValue.gender).toBe('');
  });
});
