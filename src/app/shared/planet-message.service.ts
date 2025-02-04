import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar
  ) { }

  showMessage(message: string) {
    const truncatedMessage = this.truncateMessage(message);
    this.snackBar.open(truncatedMessage, undefined, {
      duration: 3000,
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, 'X', {
      duration: 10000
    });
  }

  truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) {
      return message;
    }
    const truncatedMessage = message.slice(0, maxLength - 3);
    return truncatedMessage + '...';
  }
}
