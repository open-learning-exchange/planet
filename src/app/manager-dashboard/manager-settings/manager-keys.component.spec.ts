import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { defer, of, Subject } from 'rxjs';
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

  it('saves the entered keys, trimmed, one after another', () => {
    const saves: Subject<null>[] = [];
    configurationService.getKeyStatus.mockReturnValue(of({ ai: { openai: false, gemini: true, deepseek: false } }));
    configurationService.setKey.mockImplementation(() => defer(() => saves[saves.push(new Subject<null>()) - 1]));
    const component = createComponent();
    component.keyControls.openai.setValue(' sk-new ');
    component.keyControls.gemini.setValue('gm-2');
    let saved = false;

    component.saveKeys().subscribe(() => saved = true);
    expect(saves.length).toBe(1);
    saves[0].complete();
    expect(saves.length).toBe(2);
    saves[1].complete();

    expect(saved).toBe(true);
    expect(configurationService.setKey.mock.calls).toEqual([ [ 'ai', 'openai', 'sk-new' ], [ 'ai', 'gemini', 'gm-2' ] ]);
  });
});
