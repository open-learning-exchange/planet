import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-file-input',
  template: `
    <div class="inner-gaps by-column">
      <button type="button" mat-raised-button (click)="fileInput.click()" color="primary" i18n>Choose File</button>
      <input hidden (change)="onFileSelected($event)" #fileInput type="file">
      <span class="file-name" i18n>{{ getTruncatedFileName() }}</span>
    </div>
  `,
})
export class FileInputComponent {

  @Output() fileChange = new EventEmitter<any>();

  selectedFile: any = null;
  onFileSelected(event: any): void {
      this.selectedFile = event.target.files[0] ?? null;
      this.fileChange.emit(event);
  }

  getTruncatedFileName(): string {
    const maxLength = 25;
    if (!this.selectedFile?.name) {
      return 'No file chosen';
    }
    const fileName = this.selectedFile.name;
    return fileName.length > maxLength ? `${fileName.slice(0, maxLength)}...` : fileName;
  }

}

