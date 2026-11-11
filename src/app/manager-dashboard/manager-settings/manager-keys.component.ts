import { Component, Input, OnInit } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { TitleCasePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';

import { ConfigurationService, KeyService } from '../../configuration/configuration.service';

@Component({
  selector: 'planet-manager-keys',
  templateUrl: './manager-keys.component.html',
  styleUrls: [ './manager-settings.shared.scss' ],
  imports: [
    ReactiveFormsModule, TitleCasePipe, MatButton, MatCard, MatCardHeader, MatCardTitle, MatCardContent,
    MatList, MatListItem, MatListItemTitle, MatFormField, MatLabel, MatInput
  ]
})
export class ManagerKeysComponent implements OnInit {
  @Input() service: KeyService;
  @Input() heading = '';
  status: Record<string, boolean> | undefined;
  statusFailed = false;
  keyControls: Record<string, FormControl<string>> = {};
  private removeDialog: MatDialogRef<DialogsPromptComponent>;

  constructor(
    private fb: NonNullableFormBuilder,
    private dialog: MatDialog,
    private configurationService: ConfigurationService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.configurationService.getKeyStatus().subscribe({
      next: (status) => {
        this.status = status[this.service] || {};
        this.keyControls = Object.keys(this.status).reduce((controls, name) => ({ ...controls, [name]: this.fb.control('') }), {});
      },
      error: () => this.statusFailed = true
    });
  }

  get names(): string[] {
    return Object.keys(this.status || {});
  }

  // Called by the page's save button
  saveTypedKeys(): Observable<unknown> {
    const typed = this.names.filter((name) => this.keyControls[name].value.trim());
    return typed.length ?
      forkJoin(typed.map((name) => this.configurationService.setKey(this.service, name, this.keyControls[name].value.trim()))) :
      of([]);
  }

  removeKey(name: string) {
    const label = new TitleCasePipe().transform(name);
    this.removeDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.configurationService.removeKey(this.service, name),
          onNext: () => {
            this.status[name] = false;
            this.removeDialog.close();
            this.planetMessageService.showMessage($localize`Key removed`);
          },
          onError: () => this.planetMessageService.showAlert($localize`There was an error removing the key`)
        },
        showMainParagraph: false,
        extraMessage: $localize`Remove the ${label}:label: key? Saved keys can't be shown again, so setting it back needs the key itself.`
      }
    });
  }

}
