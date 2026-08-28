import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AIServiceDiscovery } from '../chat/chat.model';
import { ConfigurationService } from '../configuration/configuration.service';
import { ChatService } from '../shared/chat.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { ManagerAIServicesComponent } from './manager-aiservices.component';

const discovery: AIServiceDiscovery = {
  providers: {
    openai: {
      label: 'OpenAI',
      enabled: false,
      capabilities: [ 'chat', 'fileSearch', 'structuredOutput' ],
      fileSearchContentTypes: [ 'application/pdf' ]
    },
    anthropic: {
      label: 'Anthropic (Claude)',
      enabled: false,
      capabilities: [ 'chat' ],
      fileSearchContentTypes: []
    }
  },
  promptDefaults: {
    general_chat: 'General default',
    course_help: 'Course default',
    survey_analysis: 'Survey default'
  }
};

describe('ManagerAIServicesComponent', () => {
  let component: ManagerAIServicesComponent;
  const chatService = {
    getAIServiceDiscovery: vi.fn().mockReturnValue(of(discovery)),
    refreshAIProviders: vi.fn()
  };
  const configurationService = { patchLocalConfiguration: vi.fn().mockReturnValue(of({})) };
  const stateService = {
    configuration: { _id: 'configuration-id', streaming: false, models: { 'legacy-provider': 'legacy-model' } },
    keys: { 'legacy-provider': 'legacy-key' },
    requestData: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [ ManagerAIServicesComponent ],
      providers: [
        provideRouter([ { path: 'manager', component: ManagerAIServicesComponent } ]),
        { provide: ChatService, useValue: chatService },
        { provide: ConfigurationService, useValue: configurationService },
        { provide: StateService, useValue: stateService },
        { provide: PlanetMessageService, useValue: { showAlert: vi.fn(), showMessage: vi.fn() } }
      ]
    });
    const fixture: ComponentFixture<ManagerAIServicesComponent> = TestBed.createComponent(ManagerAIServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders only providers the gateway registry advertises', () => {
    expect(component.providerNames).toEqual([ 'openai', 'anthropic' ]);
    expect(component.providerLabel('anthropic')).toEqual('Anthropic (Claude)');
    expect(component.configForm.get('keys_anthropic')).toBeTruthy();
    // Retired names keep their control so saving carries the value through, but no row is drawn.
    expect(component.configForm.get('models_legacy-provider')?.value).toEqual('legacy-model');
  });

  it('flags unreachable discovery instead of rendering an empty form', () => {
    chatService.getAIServiceDiscovery.mockReturnValueOnce(of(null));
    const fixture: ComponentFixture<ManagerAIServicesComponent> = TestBed.createComponent(ManagerAIServicesComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.providerDiscoveryFailed).toEqual(true);
    // Stored names still render so an existing community keeps its inputs while the gateway is down.
    expect(fixture.componentInstance.providerNames).toEqual([ 'legacy-provider' ]);
  });

  it('disables the built-in prompt reset until an override exists', () => {
    expect(component.hasPromptOverrides()).toEqual(false);
    component.configForm.get('promptCourseHelp')?.setValue('  ');
    expect(component.hasPromptOverrides()).toEqual(false);
    component.configForm.get('promptCourseHelp')?.setValue('Custom course instructions');
    expect(component.hasPromptOverrides()).toEqual(true);
    component.useBuiltInPrompts();
    expect(component.hasPromptOverrides()).toEqual(false);
  });

  it('saves only configured registry values without discarding legacy entries', () => {
    component.configForm.get('keys_anthropic')?.setValue('claude-key');
    component.configForm.get('models_anthropic')?.setValue('claude-sonnet-4-6');
    component.saveConfig();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith(expect.objectContaining({
      keys: { 'legacy-provider': 'legacy-key', anthropic: 'claude-key' },
      models: { 'legacy-provider': 'legacy-model', anthropic: 'claude-sonnet-4-6' }
    }));
  });

  it('trims prompt overrides before saving', () => {
    component.configForm.get('promptGeneralChat')?.setValue('  Community instructions  ');
    component.configForm.get('promptCourseHelp')?.setValue('   ');

    component.saveConfig();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith(expect.objectContaining({
      promptProfiles: {
        general_chat: 'Community instructions',
        course_help: '',
        survey_analysis: ''
      }
    }));
  });
});
