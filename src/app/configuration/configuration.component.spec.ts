import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { vi } from 'vitest';

import { CouchService } from '@shared/database/couchdb.service';
import { FormErrorMessagesComponent } from '@shared/forms/form-error-messages.component';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { SyncService } from '@shared/database/sync.service';

import { ValidatorService } from '../validators/validator.service';
import { ConfigurationComponent } from './configuration.component';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationComponent', () => {
  let component: ConfigurationComponent;
  let fixture: ComponentFixture<ConfigurationComponent>;

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn()
  };

  const stateServiceMock = {
    configuration: { _id: 'config_id' },
    requestData: vi.fn(),
    couchStateListener: vi.fn().mockReturnValue(of([]))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ConfigurationComponent, FormErrorMessagesComponent
      ],
      providers: [
        CouchService,
        ValidatorService,
        ConfigurationService,
        PlanetMessageService,
        { provide: DialogsFormService, useValue: dialogsFormServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: SyncService, useValue: { getReplicationState: vi.fn().mockReturnValue(of({})) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { update: false } }
          }
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });
    fixture = TestBed.createComponent(ConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the step invalid while the nation list loads and no parent is set', () => {
    expect(component.configurationFormGroup.controls.parentDomain.disabled).toBe(true);
    expect(component.configurationFormGroup.hasError('required')).toBe(true);
    component.configurationFormGroup.controls.parentDomain.setValue('vi.example/db');
    expect(component.configurationFormGroup.hasError('required')).toBe(false);
  });
});

describe('ConfigurationComponent update', () => {
  let component: ConfigurationComponent;
  const saved = {
    _id: 'config_id', planetType: 'community', parentDomain: 'vi.example/db', parentCode: 'vi', localDomain: 'localhost:2200',
    name: 'planet', code: 'planet', preferredLang: 'English', autoAccept: true, alwaysOnline: false, betaEnabled: 'off',
    firstName: 'a', lastName: 'b', email: 'a@b.org', phoneNumber: '1'
  };
  const afterClosed = vi.fn();
  const dialogMock = { open: vi.fn().mockReturnValue({ afterClosed }) };
  const configurationServiceMock = { patchConfiguration: vi.fn().mockReturnValue(of({})) };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [ ConfigurationComponent ],
      providers: [
        { provide: CouchService, useValue: { get: () => of(saved).pipe(delay(0)), post: () => of({ docs: [] }), datePlaceholder: {} } },
        { provide: ValidatorService, useValue: { isUnique$: () => of(null) } },
        { provide: ConfigurationService, useValue: configurationServiceMock },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: StateService, useValue: { configuration: { _id: 'config_id' }, requestData: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { update: true } } } },
        { provide: MatDialog, useValue: dialogMock },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(ConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('disables the code', () => {
    expect(component.configurationFormGroup.controls.code.disabled).toBe(true);
  });

  it('saves a settings change without asking', () => {
    component.configurationFormGroup.controls.alwaysOnline.setValue(true);
    component.onSubmitConfiguration();
    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(configurationServiceMock.patchConfiguration).toHaveBeenCalled();
  });

  it.each([
    [ 'planetType', 'nation', 'Nation/Community' ],
    [ 'parentDomain', 'other.example/db', 'Parent' ],
    [ 'localDomain', 'other.example:2200', 'Local URL' ],
    [ 'name', 'renamed', 'Name' ]
  ] as const)('saves a %s change only after it is confirmed', (key, value, label) => {
    component.configurationFormGroup.controls[key].setValue(value);
    afterClosed.mockReturnValueOnce(of(undefined));
    component.onSubmitConfiguration();
    const message: string = dialogMock.open.mock.calls[0][1].data.extraMessage;
    expect(message).toContain(label);
    expect(message.includes('register again')).toBe(key === 'planetType' || key === 'parentDomain');
    expect(configurationServiceMock.patchConfiguration).not.toHaveBeenCalled();

    afterClosed.mockReturnValueOnce(of(true));
    component.onSubmitConfiguration();
    expect(configurationServiceMock.patchConfiguration).toHaveBeenCalled();
  });

  it('saves a parent set while its select is still disabled', () => {
    const parentDomain = component.configurationFormGroup.controls.parentDomain;
    parentDomain.disable();
    parentDomain.setValue('other.example/db');
    afterClosed.mockReturnValueOnce(of(true));
    component.onSubmitConfiguration();
    expect(configurationServiceMock.patchConfiguration)
      .toHaveBeenCalledWith(expect.objectContaining({ parentDomain: 'other.example/db' }));
  });
});
