import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DeviceInfoService } from './device-info.service';
import { DialogsAndroidAppComponent } from './dialogs/dialogs-android-app.component';

@Injectable({
  providedIn: 'root'
})
export class AndroidAppPromptService {
  private readonly promptDismissedKey = 'planet-android-survey-app-prompt-dismissed';

  constructor(
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog
  ) {}

  maybePrompt() {
    if (!this.deviceInfoService.isAndroid() || this.isDismissed()) {
      return;
    }

    this.dialog.open(DialogsAndroidAppComponent, { maxWidth: '90vw', width: '400px' })
      .afterClosed().subscribe(() => this.dismissPrompt());
  }

  private isDismissed(): boolean {
    try {
      return sessionStorage.getItem(this.promptDismissedKey) === 'true';
    } catch {
      return false;
    }
  }

  private dismissPrompt() {
    try {
      sessionStorage.setItem(this.promptDismissedKey, 'true');
    } catch {
      // The banner remains available when storage is unavailable.
    }
  }
}
