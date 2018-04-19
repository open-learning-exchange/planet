import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';

@Injectable()
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar
  ) { }

  showMessage(message: string) {
    this.snackBar.open(message, ' ', {
      duration: 3000,
      extraClasses: [ 'show-snackbar' ]
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, ' ', {
      duration: 3000,
      extraClasses: [ 'alert-snackbar' ]
    });
  }
}
