import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { Location } from '@angular/common';
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
  let location: Location;
  let router: Router;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, RouterModule, MaterialModule, UsersProfileComponent],
      providers: [CouchService, UserService, DialogsFormService, provideHttpClient(withInterceptorsFromDi())]
    });
    location = TestBed.inject(Location);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(UsersProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call location.back on goBack when history exists', () => {
    const backSpy = vi.spyOn(location, 'back');
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);

    component.goBack();

    expect(backSpy).toHaveBeenCalled();
  });

  it('should navigate to home on goBack when history does not exist', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

    component.goBack();

    expect(navigateSpy).toHaveBeenCalledWith([ '/' ]);
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
