import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DeviceInfoService } from './device-info.service';
import { DialogsAndroidAppComponent } from './dialogs/dialogs-android-app.component';

@Injectable({
  providedIn: 'root'
})
export class AndroidAppPromptService {
  // Keep the prompt dismissed across reloads and restores for the lifetime of this tab's page session.
  private readonly dismissedSessionStorageKey = 'planet-android-survey-app-prompt-dismissed';

  constructor(
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog
  ) {}

  openIfEligible() {
    if (!this.deviceInfoService.isAndroid() || this.wasDismissedThisSession()) {
      return;
    }

    this.dialog.open(DialogsAndroidAppComponent, { maxWidth: '90vw', width: '400px' })
      .afterClosed().subscribe(() => this.markDismissedForSession());
  }

  private wasDismissedThisSession(): boolean {
    try {
      return sessionStorage.getItem(this.dismissedSessionStorageKey) === 'true';
    } catch {
      return false;
    }
  }

  private markDismissedForSession() {
    try {
      sessionStorage.setItem(this.dismissedSessionStorageKey, 'true');
    } catch {
      // The banner remains available when storage is unavailable.
    }
  }
}
