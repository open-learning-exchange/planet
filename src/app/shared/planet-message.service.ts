import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';

@Injectable()
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar
  ) { }

  showMessage(message: string, time?: number) {
    this.snackBar.open(message, undefined, {
      duration: time || 3000,
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, 'X', {
    });
  }
}
