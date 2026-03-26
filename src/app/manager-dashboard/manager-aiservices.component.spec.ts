import { NonNullableFormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ManagerAIServicesComponent } from './manager-aiservices.component';

class MockClipboard {
  copy() {}
}

class MockConfigurationService {
  updateConfiguration = jasmine.createSpy('updateConfiguration').and.returnValue(of({}));
}

class MockPlanetMessageService {
  showAlert = jasmine.createSpy('showAlert');
  showMessage = jasmine.createSpy('showMessage');
}

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockStateService {
  configuration: any = {
    _id: 'config-id',
    _rev: '1-abc',
    owner: 'planet-owner',
    streaming: true,
    keys: { openai: 'key' },
    models: { openai: 'gpt-4o-mini' },
    assistant: {
      enabled: true,
      name: 'Planet Context',
      instructions: 'Be helpful'
    }
  };
  keys = { openai: 'key' };
  requestData = jasmine.createSpy('requestData');
}

describe('ManagerAIServicesComponent', () => {
  let component: ManagerAIServicesComponent;
  let configurationService: MockConfigurationService;
  let stateService: MockStateService;

  beforeEach(() => {
    configurationService = new MockConfigurationService();
    stateService = new MockStateService();

    component = new ManagerAIServicesComponent(
      new NonNullableFormBuilder(),
      new MockClipboard() as any,
      configurationService as any,
      new MockPlanetMessageService() as any,
      new MockRouter() as any,
      stateService as any
    );

    component.ngOnInit();
  });

  it('should initialize assistant toggle from configuration', () => {
    expect(component.configForm.controls.assistantEnabled.value).toBeTrue();
  });

  it('should persist assistant toggle and preserve ownership metadata on save', () => {
    component.configForm.controls.assistantEnabled.setValue(false);

    component.saveConfig();

    const savedConfig = configurationService.updateConfiguration.calls.mostRecent().args[0];
    expect(savedConfig.owner).toEqual('planet-owner');
    expect(savedConfig._id).toEqual('config-id');
    expect(savedConfig._rev).toEqual('1-abc');
    expect(savedConfig.assistant.enabled).toBeFalse();
  });
});
