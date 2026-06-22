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
          useValue: {
            get: vi.fn().mockReturnValue(of({ name: 'testuser', roles: [] }))
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { submission: true },
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
  });
});
