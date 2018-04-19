import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material';

@Injectable()
export class PlanetMessageService {
  private config: MatSnackBarConfig;
  constructor( private snackBar: MatSnackBar ) {
    this.config = new MatSnackBarConfig();
    this.config.duration = 3000;
  }

  showMessage(message: string, duration?: number, action?: string) {
    this.config = duration ? Object.assign(this.config, { 'duration': duration }) : this.config;
    this.snackBar.open(message, action, this.config);
  }

  showAlert(message: string, duration?: number, action?: string) {
    this.config = duration ? Object.assign(this.config, { 'duration': duration }) : this.config;
    this.snackBar.open(message, action, this.config);
  }
}
