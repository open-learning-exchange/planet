import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlanetMessageService } from '@shared/ui/planet-message.service';

import { ConfigurationService } from '../../configuration/configuration.service';
import { ManagerKeysComponent } from './manager-keys.component';

describe('ManagerKeysComponent', () => {
  let fixture: ComponentFixture<ManagerKeysComponent>;
  const configurationService = { getKeyStatus: vi.fn(), setKey: vi.fn(), removeKey: vi.fn() };

  const createComponent = () => {
    TestBed.configureTestingModule({
      imports: [ ManagerKeysComponent ],
      providers: [
        { provide: ConfigurationService, useValue: configurationService },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } }
      ]
    });
    fixture = TestBed.createComponent(ManagerKeysComponent);
    fixture.componentInstance.service = 'ai';
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  afterEach(() => {
    vi.resetAllMocks();
    TestBed.resetTestingModule();
  });

  it('saves only the keys typed in, trimmed, when the page saves', () => {
    configurationService.getKeyStatus.mockReturnValue(of({ ai: { openai: false, gemini: true }, currency: { openexchangerates: false } }));
    configurationService.setKey.mockReturnValue(of(null));
    const component = createComponent();
    component.keyControls.openai.setValue(' sk-new ');

    component.saveKeys().subscribe();

    expect(configurationService.setKey).toHaveBeenCalledTimes(1);
    expect(configurationService.setKey).toHaveBeenCalledWith('ai', 'openai', 'sk-new');
  });
});
