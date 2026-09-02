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

  it('should not render toolbar back button when isDialog is true', () => {
    component.isDialog = true;
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.km-profile-back-button'));
    expect(backButton).toBeNull();
  });
});
