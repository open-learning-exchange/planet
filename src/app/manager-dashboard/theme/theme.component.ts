import { Component, Input } from '@angular/core';
import { ConfigurationService } from '../../configuration/configuration.service';
import { StateService } from '../../shared/state.service';

@Component({
  template: `
    <mat-form-field>
      <mat-select i18n-placeholder placeholder="Color Theme" [(ngModel)]="selectedColorTheme">
        <mat-option [value]="'blue'" i18n>Blue</mat-option>
        <mat-option [value]="'purple'" i18n>Purple</mat-option>
      </mat-select>
    </mat-form-field>
    <button mat-raised-button (click)="updateConfigurationTheme()">Update</button>
  `
})
export class ThemeComponent {

  configuration = this.stateService.configuration;
  selectedColorTheme: string = this.configuration.customization?.colorTheme || "blue";
  colorThemeValues = ['blue','purple'];

  constructor(
    private configurationService: ConfigurationService,
    private stateService: StateService
  ) {};

  updateConfigurationTheme() {
    const newConfiguration = {
      ...this.configuration,
      customization: {
        colorTheme: this.selectedColorTheme
      }
    }
    this.configurationService.updateConfiguration(newConfiguration).subscribe();
  }

}
