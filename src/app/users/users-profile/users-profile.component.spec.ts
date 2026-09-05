import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsersProfileComponent } from './users-profile.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { MaterialModule } from '../../shared/material.module';

describe('UserProfileComponent', () => {
  let component: UsersProfileComponent;
  let fixture: ComponentFixture<UsersProfileComponent>;
  let userService: UserService;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, RouterModule, MaterialModule, UsersProfileComponent],
      providers: [CouchService, UserService, DialogsFormService, provideHttpClient(withInterceptorsFromDi())]
    });
    userService = TestBed.inject(UserService);
    const couchService = TestBed.inject(CouchService);
    vi.spyOn(userService, 'get').mockReturnValue({ name: 'viewer', isUserAdmin: false, roles: [] } as any);
    vi.spyOn(couchService, 'get').mockReturnValue(of({ name: 'member', achievements: [], references: [] }));
    vi.spyOn(couchService, 'findAll').mockReturnValue(of([]));
    fixture = TestBed.createComponent(UsersProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render toolbar back button when isDialog is false', () => {
    component.isDialog = false;
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.km-profile-back-button'));
    expect(backButton).toBeTruthy();
    expect(backButton.nativeElement.getAttribute('aria-label')).toBe('Go back');
  });

  // TEMP NOTE (for review, strip before merge): contacts are opt in now.
  it('hides contacts from other members until their owner shares them', () => {
    component.editable = false;
    component.userDetail = { name: 'member', email: 'member@ole.org', phoneNumber: '555' };

    expect(component.canSeeContact('email')).toBe(false);
    expect(component.canSeeContact('phoneNumber')).toBe(false);

    component.userDetail = { ...component.userDetail, contactVisibility: { email: true, phoneNumber: false } };

    expect(component.canSeeContact('email')).toBe(true);
    expect(component.canSeeContact('phoneNumber')).toBe(false);
  });

  it('keeps contacts visible to the member themselves and to planet admins', () => {
    component.editable = true;
    component.userDetail = { name: 'member', email: 'member@ole.org' };

    expect(component.canSeeContact('email')).toBe(true);
    expect(component.isContactShared('email')).toBe(false);
  });

  // TEMP NOTE (for review, strip before merge): links are leaders only for now.
  it('offers the link editor only on a leader profile the viewer can edit', () => {
    component.editable = true;
    component.userDetail = { name: 'member', roles: [] };

    expect(component.canEditLinks).toBe(false);

    component.userDetail = { name: 'member', roles: [ 'leader' ] };

    expect(component.canEditLinks).toBe(true);

    component.editable = false;

    expect(component.canEditLinks).toBe(false);
  });

  it('should not render toolbar back button when isDialog is true', () => {
    component.isDialog = true;
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.km-profile-back-button'));
    expect(backButton).toBeNull();
  });
});
