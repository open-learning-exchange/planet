import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { defer, EMPTY, Observable, of } from 'rxjs';
import { PlanetMessageService } from '../planet-message.service';
import { DialogGuardService } from './dialog-guard.service';
import { DialogsPromptComponent } from './dialogs-prompt.component';

export type DialogsPromptAmount = 'single' | 'many';

export interface DialogsPromptLabel {
  field: string;
  value: any;
}

/* Everything DialogsPromptComponent renders.  See its template for the type/changeType options. */
export interface DialogsPromptContent {
  type?: string;
  changeType?: string;
  amount?: DialogsPromptAmount;
  count?: number;
  displayName?: string;
  showMainParagraph?: boolean;
  cancelable?: boolean;
  extraMessage?: string;
  rules?: string;
  showLabels?: DialogsPromptLabel[];
  displayDates?: { startDate: any, endDate: any };
  isDateUtc?: boolean;
}

export interface DialogsPromptOptions<T = any> extends DialogsPromptContent {
  // Observable form keeps the caller's creation timing; function form defers creation to the OK click.
  request?: Observable<T> | (() => Observable<T>);
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  successMessage?: string | ((result: T) => string);
  errorMessage?: string;
  // Defaults to true, so the prompt goes away once the confirmed action succeeds.
  closeOnSuccess?: boolean;
  // Defaults to false, so a failed action leaves the prompt open for another attempt.
  closeOnError?: boolean;
  // Defaults to true only for observable-backed operations, since local actions finish instantly.
  spinnerOn?: boolean;
  // When set, a second request for the same key is ignored until the open prompt closes.
  key?: string;
  config?: Omit<MatDialogConfig, 'data'>;
}

@Injectable({ providedIn: 'root' })
export class DialogsPromptService {

  constructor(
    private dialog: MatDialog,
    private dialogGuard: DialogGuardService,
    private planetMessageService: PlanetMessageService
  ) {}

  open<T = any>(options: DialogsPromptOptions<T>): MatDialogRef<DialogsPromptComponent> | null {
    const { key } = options;
    return key ?
      this.dialogGuard.openNow(key, () => this.openPrompt(options)) :
      this.openPrompt(options);
  }

  // Resolves with the dialog result: true when the confirmed action succeeded, undefined when cancelled.
  confirm<T = any>(options: DialogsPromptOptions<T>): Observable<any> {
    const dialogRef = this.open(options);
    return dialogRef ? dialogRef.afterClosed() : EMPTY;
  }

  confirmUnsavedChanges(content: DialogsPromptContent = {}): Observable<any> {
    return this.confirm({ changeType: 'exit', type: 'changes', cancelable: true, ...content });
  }

  private openPrompt<T>(options: DialogsPromptOptions<T>): MatDialogRef<DialogsPromptComponent> {
    const {
      request, onSuccess, onError, successMessage, errorMessage,
      closeOnSuccess = true, closeOnError = false, spinnerOn, key, config, ...content
    } = options;
    const dialogRef = this.dialog.open<DialogsPromptComponent>(DialogsPromptComponent, {
      ...config,
      data: {
        ...content,
        spinnerOn: spinnerOn === undefined ? request !== undefined : spinnerOn,
        okClick: {
          request: typeof request === 'function' ? defer(request) : request || of(true),
          onNext: (result: T) => {
            if (closeOnSuccess) {
              dialogRef.close(true);
            }
            if (onSuccess) {
              onSuccess(result);
            }
            const message = typeof successMessage === 'function' ? successMessage(result) : successMessage;
            if (message) {
              this.planetMessageService.showMessage(message);
            }
          },
          onError: (error: any) => {
            if (closeOnError) {
              dialogRef.close(false);
            }
            if (onError) {
              onError(error);
            }
            if (errorMessage) {
              this.planetMessageService.showAlert(errorMessage);
            }
          }
        }
      }
    });
    return dialogRef;
  }

}
