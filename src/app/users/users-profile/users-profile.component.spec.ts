import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { UsersProfileComponent } from './users-profile.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { MaterialModule } from '../../shared/material.module';

describe('UserProfileComponent', () => {
  let component: UsersProfileComponent;
  let fixture: ComponentFixture<UsersProfileComponent>;
  let router: Router;
  let route: ActivatedRoute;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, RouterModule, MaterialModule, UsersProfileComponent],
      providers: [CouchService, UserService, DialogsFormService, provideHttpClient(withInterceptorsFromDi())]
    });
    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);
    fixture = TestBed.createComponent(UsersProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to returnState route on goBack when returnState exists', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({ returnState: { route: '/teams/members' } });

    component.goBack();

    expect(navigateSpy).toHaveBeenCalledWith([ '/teams/members' ]);
  });

  it('should navigate relative to ../../ on goBack when returnState does not exist', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(window.history, 'state', 'get').mockReturnValue({});

    component.goBack();

    expect(navigateSpy).toHaveBeenCalledWith([ '../../' ], { relativeTo: route });
  });

  it('should render toolbar back button when isDialog is false', () => {
    component.isDialog = false;
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('mat-toolbar button[aria-label="Go back"]'));
    expect(backButton).toBeTruthy();
  });

  it('should not render toolbar back button when isDialog is true', () => {
    component.isDialog = true;
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('mat-toolbar button[aria-label="Go back"]'));
    expect(backButton).toBeNull();
  });
});
