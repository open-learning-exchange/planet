import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { truncateText } from './utils';

@Injectable({
  providedIn: 'root'
})
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar
  ) { }

  showMessage(message: string) {
    const truncatedMessage = truncateText(message, 47);
    this.snackBar.open(truncatedMessage, undefined, {
      duration: 3000,
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, 'X', {
      duration: 10000
    });
  }

}
