import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { StateService } from '@shared/state.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';

import { AIServiceStatus, ProviderDiscovery } from '../../chat/chat.model';
import { ConfigurationService } from '../../configuration/configuration.service';
import { ManagerKeysComponent } from './manager-keys.component';

interface ConfigFormControls {
  streaming: FormControl<boolean>;
  models: FormGroup<Record<string, FormControl<string>>>;
  assistantName: FormControl<string>;
  assistantInstructions: FormControl<string>;
}

interface AIConfiguration {
  [key: string]: unknown;
  streaming?: boolean;
  models?: Record<string, string>;
  assistant?: {
    name?: string;
    instructions?: string;
  };
}

@Component({
  templateUrl: './manager-aiservices.component.html',
  styleUrls: ['./manager-settings.shared.scss'],
  imports: [
    MatToolbar,
    MatIconButton,
    RouterLink,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatList,
    MatListItem,
    MatListItemTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatSlideToggle,
    MatTooltip,
    MatButton,
    ManagerKeysComponent
  ]
})
export class ManagerAIServicesComponent implements OnInit, OnDestroy {
  @ViewChild(ManagerKeysComponent) keysCard: ManagerKeysComponent;
  configuration: AIConfiguration = {};
  configForm: FormGroup<ConfigFormControls>;
  discovery: ProviderDiscovery = { state: 'loading' };
  labels: Record<string, string> = {};
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: NonNullableFormBuilder,
    private configurationService: ConfigurationService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private aiChatService: AiChatService
  ) {}

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    this.configForm = this.fb.group({
      streaming: this.fb.control(!!this.configuration.streaming),
      models: this.fb.group<Record<string, FormControl<string>>>({}),
      assistantName: this.fb.control(this.configuration.assistant?.name || ''),
      assistantInstructions: this.fb.control(this.configuration.assistant?.instructions || '')
    });
    this.aiChatService.refreshAIProviders();
    this.aiChatService.providerDiscovery$.pipe(takeUntil(this.unsubscribe$)).subscribe((discovery) => {
      this.discovery = discovery;
      if (discovery.state === 'loaded') {
        this.setProviders(discovery.providers);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  retry() {
    this.aiChatService.refreshAIProviders();
    if (this.keysCard.statusFailed) {
      this.keysCard.loadStatus();
    }
  }

  // addControl keeps an existing control, so a later answer doesn't wipe a model being typed
  private setProviders(providers: AIServiceStatus[]) {
    const models = this.configuration.models || {};
    this.labels = Object.fromEntries(providers.map(({ name, label }) => [ name, label ]));
    providers.forEach(({ name }) => this.configForm.controls.models.addControl(name, this.fb.control(models[name] || '')));
  }

  saveConfig() {
    if (!this.configuration?._id || !this.configForm.valid) {
      return;
    }
    this.dialogsLoadingService.start();
    const { streaming, models, assistantName, assistantInstructions } = this.configForm.getRawValue();
    const configPatch = {
      streaming,
      // Keeps models for providers the registry no longer lists, since the patch replaces `models` whole
      models: { ...this.configuration.models, ...models },
      assistant: { name: assistantName, instructions: assistantInstructions }
    };
    this.keysCard.saveKeys().pipe(
      switchMap(() => this.configurationService.patchLocalConfiguration(configPatch)),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(
      () => this.stateService.requestData('configurations', 'local'),
      err => {
        this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
      }, () => {
        this.router.navigate([ '/manager' ]);
        this.planetMessageService.showMessage($localize`Configuration Updated Successfully`);
      }
    );
  }

}
