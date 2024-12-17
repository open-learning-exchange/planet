import { Injectable, HostListener } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class PlanetMessageService {
  constructor(
    private snackBar: MatSnackBar,
  ) { 
  }

  truncateMessage(message: string) {
    const maxLength = 45;
    if (message.length <= maxLength) {
      return message;
    } else {
      return message.slice(0, maxLength) + '...';
    }
  }
  
  showMessage(message: string) {
    this.snackBar.open(this.truncateMessage(message), undefined, {
      duration: 3000,
    });
  }

  showAlert(message: string) {
    this.snackBar.open(message, 'X', {
      duration: 10000
    });
  }
}
