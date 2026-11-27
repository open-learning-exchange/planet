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
  const configurationService = { getKeyStatus: vi.fn(), patchLocalConfiguration: vi.fn(), reloadGatewayConfiguration: vi.fn() };
  const aiChatService = { providerDiscovery$: new BehaviorSubject<ProviderDiscovery>({ state: 'loading' }), refreshAIProviders: vi.fn() };
  let fixture: ComponentFixture<ManagerAIServicesComponent>;

  const createComponent = (configuration: object) => {
    configurationService.getKeyStatus.mockReturnValue(of({ ai: { openai: true, deepseek: false } }));
    configurationService.patchLocalConfiguration.mockReturnValue(of({}));
    configurationService.reloadGatewayConfiguration.mockReturnValue(of(null));
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

  it('lists every registry provider by label, with no keys or models saved', () => {
    const component = createComponent({ _id: 'configuration' });
    const text = fixture.nativeElement.textContent;

    expect(component.configForm.controls.models.value).toEqual({ openai: '', deepseek: '' });
    expect(text).toContain('Enter DeepSeek key');
    expect(text).not.toContain('Deepseek');
  });

  it('saves models on a copy, keeping unlisted ones and edits made before a later answer', () => {
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

  it('refreshes the providers once the gateway has reloaded the saved configuration', () => {
    const component = createComponent({ _id: 'configuration' });

    component.saveConfig();

    expect(configurationService.reloadGatewayConfiguration).toHaveBeenCalledTimes(1);
    expect(aiChatService.refreshAIProviders).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(PlanetMessageService).showMessage).toHaveBeenCalled();
  });

  it('keeps a save the gateway could not reload, and says it applies at the next restart', () => {
    const component = createComponent({ _id: 'configuration' });
    configurationService.reloadGatewayConfiguration.mockReturnValue(throwError(() => new Error('Unauthorized')));

    component.saveConfig();

    expect(aiChatService.refreshAIProviders).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(PlanetMessageService).showAlert).toHaveBeenCalledWith(expect.stringContaining('next restart'));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([ '/manager' ]);
  });

  it('shows a failed list, and Try again reloads the providers and the failed keys', () => {
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
