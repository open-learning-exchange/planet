import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { AndroidAppPromptService } from './android-app-prompt.service';
import { DeviceInfoService } from './device-info.service';
import { DialogsAndroidAppComponent } from './dialogs-android-app.component';

describe('AndroidAppPromptService', () => {
  let afterClosed$: Subject<void>;
  let deviceInfoService: { isAndroid: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let service: AndroidAppPromptService;

  beforeEach(() => {
    afterClosed$ = new Subject<void>();
    deviceInfoService = { isAndroid: vi.fn().mockReturnValue(true) };
    dialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => afterClosed$ })
    };
    service = new AndroidAppPromptService(
      deviceInfoService as unknown as DeviceInfoService,
      dialog as unknown as MatDialog
    );
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('does not prompt non-Android devices', () => {
    deviceInfoService.isAndroid.mockReturnValue(false);

    service.openIfEligible();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('does not prompt after a prior dismissal', () => {
    sessionStorage.setItem('planet-android-survey-app-prompt-dismissed', 'true');

    service.openIfEligible();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('prompts first-time Android visitors and persists after close', () => {
    service.openIfEligible();

    expect(dialog.open).toHaveBeenCalledWith(
      DialogsAndroidAppComponent,
      { maxWidth: '90vw', width: '400px' }
    );
    expect(sessionStorage.getItem('planet-android-survey-app-prompt-dismissed')).toBeNull();

    afterClosed$.next();

    expect(sessionStorage.getItem('planet-android-survey-app-prompt-dismissed')).toBe('true');
  });

  it('prompts when sessionStorage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    service.openIfEligible();

    expect(dialog.open).toHaveBeenCalled();
  });

  it('ignores sessionStorage write errors after the dialog closes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    service.openIfEligible();

    expect(() => afterClosed$.next()).not.toThrow();
  });
});
