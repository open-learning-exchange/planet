import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginFormComponent } from './login-form.component';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../shared/state.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { ValidatorService } from '../validators/validator.service';
import { PouchAuthService } from '../shared/database/pouch-auth.service';
import { LoginTasksService } from './login-tasks.service';
import { of } from 'rxjs';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let mockActivatedRoute: any;
  let mockStateService: any;

  beforeEach(() => {
    mockActivatedRoute = {
      snapshot: {
        queryParams: {}
      }
    };

    mockStateService = {
      configuration: {
        planetType: 'center'
      }
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        LoginFormComponent,
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: StateService, useValue: mockStateService },
        { provide: CouchService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: PlanetMessageService, useValue: {} },
        { provide: ValidatorService, useValue: {} },
        { provide: PouchAuthService, useValue: {} },
        { provide: LoginTasksService, useValue: {} }
      ]
    });

    component = TestBed.inject(LoginFormComponent);
  });

  it('should use default URL when returnUrl is missing', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = undefined;
    expect(component.returnUrl).toBe('myDashboard');
  });

  it('should use returnUrl when it is a safe local path', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = 'safe/path';
    expect(component.returnUrl).toBe('safe/path');
  });

  it('should fallback to default URL when returnUrl is an external URL (https)', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = 'https://evil.com';
    expect(component.returnUrl).toBe('myDashboard');
  });

  it('should fallback to default URL when returnUrl is an external URL (http)', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = 'http://evil.com';
    expect(component.returnUrl).toBe('myDashboard');
  });

  it('should fallback to default URL when returnUrl is a protocol-relative URL', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = '//evil.com';
    expect(component.returnUrl).toBe('myDashboard');
  });

  it('should fallback to default URL when returnUrl contains ://', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = 'javascript://alert(1)';
    expect(component.returnUrl).toBe('myDashboard');
  });

  it('should fallback to default URL when returnUrl is javascript: prefix', () => {
    mockActivatedRoute.snapshot.queryParams['returnUrl'] = 'javascript:alert(1)';
    expect(component.returnUrl).toBe('myDashboard');
  });
});
