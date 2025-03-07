import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfigurationService } from '../../configuration/configuration.service';
import { StateService } from '../../shared/state.service';
import { DialogsImagesComponent } from '../../shared/dialogs/dialogs-images.component';

@Component({
  template: `
    <mat-form-field>
      <mat-select i18n-placeholder placeholder="Color Theme" [(ngModel)]="selectedColorTheme">
        <mat-option [value]="'blue'" i18n>Blue</mat-option>
        <mat-option [value]="'purple'" i18n>Purple</mat-option>
      </mat-select>
    </mat-form-field>
    <button mat-raised-button (click)="addLogo()">Update Logo</button>
    <button mat-raised-button (click)="updateConfigurationTheme()">Update</button>
  `
})
export class ThemeComponent {

  configuration = this.stateService.configuration;
  selectedColorTheme: string = this.configuration.customization?.colorTheme || "blue";
  selectedLogo: string = this.configuration.customization?.logo || "";
  colorThemeValues = ['blue','purple'];

  constructor(
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private dialog: MatDialog
  ) {};

  updateConfigurationTheme() {
    const newConfiguration = {
      ...this.configuration,
      customization: {
        colorTheme: this.selectedColorTheme,
        logo: this.selectedLogo
      }
    }
    this.configurationService.updateConfiguration(newConfiguration).subscribe();
  }
  
  addLogo() {
    this.dialog.open(DialogsImagesComponent, {
      width: '500px',
      data: {
        imageGroup: 'community'
      }
    }).afterClosed().subscribe(image => {
      if (image) {
        this.selectedLogo = `${image._id}/${image.title}`;
      }
    });
  }

}
