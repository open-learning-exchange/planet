import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';

import { ProviderDiscovery } from '../../chat/chat.model';
import { ConfigurationService } from '../../configuration/configuration.service';
import { ManagerAIServicesComponent } from './manager-aiservices.component';

describe('ManagerAIServicesComponent', () => {
  const providers = [
    { name: 'openai', label: 'OpenAI', configured: true },
    { name: 'deepseek', label: 'DeepSeek', configured: false }
  ];
  const configurationService = { getKeyStatus: vi.fn(), setKey: vi.fn(), removeKey: vi.fn(), patchLocalConfiguration: vi.fn() };
  const aiChatService = { providerDiscovery$: new BehaviorSubject<ProviderDiscovery>({ state: 'loading' }), refreshAIProviders: vi.fn() };
  let fixture: ComponentFixture<ManagerAIServicesComponent>;

  const createComponent = (configuration: object) => {
    configurationService.getKeyStatus.mockReturnValue(of({ ai: { openai: true, deepseek: false } }));
    configurationService.patchLocalConfiguration.mockReturnValue(of({}));
    aiChatService.providerDiscovery$.next({ state: 'loaded', providers });
    TestBed.configureTestingModule({
      imports: [ ManagerAIServicesComponent ],
      providers: [
        provideRouter([]),
        { provide: ConfigurationService, useValue: configurationService },
        { provide: AiChatService, useValue: aiChatService },
        { provide: StateService, useValue: { configuration, requestData: vi.fn() } },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } }
      ]
    });
    fixture = TestBed.createComponent(ManagerAIServicesComponent);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  afterEach(() => {
    vi.resetAllMocks();
    TestBed.resetTestingModule();
  });

  it('lists every registry provider by its label for a configuration with no keys or models', () => {
    const component = createComponent({ _id: 'configuration' });
    const text = fixture.nativeElement.textContent;

    expect(component.configForm.controls.models.value).toEqual({ openai: '', deepseek: '' });
    expect(text).toContain('Enter DeepSeek key');
    expect(text).not.toContain('Deepseek');
  });

  it('saves models without touching the shared configuration, keeping edits through a later answer and unlisted models', () => {
    const configuration = { _id: 'configuration', models: { openai: 'gpt-4o', retired: 'old-model' } };
    const component = createComponent(configuration);

    component.configForm.controls.models.controls.deepseek.setValue('deepseek-chat');
    aiChatService.providerDiscovery$.next({ state: 'loaded', providers });
    component.saveConfig();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith(expect.objectContaining({
      models: { openai: 'gpt-4o', retired: 'old-model', deepseek: 'deepseek-chat' }
    }));
    expect(configuration.models).toEqual({ openai: 'gpt-4o', retired: 'old-model' });
  });

  it('shows a failed provider list as failed, and Try again reloads the providers and the failed keys', () => {
    configurationService.getKeyStatus.mockReturnValueOnce(throwError(() => new Error('Bad Gateway')));
    createComponent({ _id: 'configuration' });
    aiChatService.providerDiscovery$.next({ state: 'failed' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.km-providers-retry').click();

    expect(fixture.nativeElement.textContent).toContain('could not be loaded');
    expect(aiChatService.refreshAIProviders).toHaveBeenCalledTimes(2);
    expect(configurationService.getKeyStatus).toHaveBeenCalledTimes(2);
  });
});
