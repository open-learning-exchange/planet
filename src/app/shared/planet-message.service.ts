import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';

@Injectable()
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar
  ) { }

  showMessage(message: string) {
    this.snackBar.open(message, undefined, {
      duration: 3000,
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, 'X', {
      duration: 10000
    });
  }
}
