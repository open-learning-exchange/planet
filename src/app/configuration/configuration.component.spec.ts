import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialModule } from '../shared/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ValidatorService } from '../validators/validator.service';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConfigurationComponent } from './configuration.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { ConfigurationService } from './configuration.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { SyncService } from '../shared/sync.service';

describe('ConfigurationComponent', () => {
  let component: ConfigurationComponent;
  let fixture: ComponentFixture<ConfigurationComponent>;

  const dialogsFormServiceMock = {
    confirm: vi.fn().mockReturnValue(of({})),
    openDialogsForm: vi.fn(),
    closeDialogsForm: vi.fn(),
    showErrorMessage: vi.fn()
  };

  const stateServiceMock = {
    configuration: { _id: 'config_id' },
    requestData: vi.fn(),
    couchStateListener: vi.fn().mockReturnValue(of([]))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule, BrowserAnimationsModule, ReactiveFormsModule, MaterialModule, RouterTestingModule,
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
        provideHttpClient(withInterceptorsFromDi())
      ]
    });
    fixture = TestBed.createComponent(ConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
