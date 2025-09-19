import { Component, Output, EventEmitter, ViewChild } from '@angular/core';
import { truncateText } from '../../shared/utils';

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
  @ViewChild('fileInput') fileInput!: HTMLInputElement;

  selectedFile: any = null;
  onFileSelected(event: any): void {
      this.selectedFile = event.target.files[0] ?? null;
      this.fileChange.emit(event);
  }

  getTruncatedFileName(): string {
    if (!this.selectedFile?.name) {
      return $localize`No file chosen`;
    }
    return truncateText(this.selectedFile.name, 25);
  }

  clearFile() {
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

}

