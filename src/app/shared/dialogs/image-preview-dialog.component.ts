import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  templateUrl: './image-preview-dialog.component.html',
  styleUrls: ['./image-preview-dialog.component.scss']
})
export class ImagePreviewDialogComponent implements OnInit {

  previewUrl: any;
  selectedFile: File;

  constructor(
    public dialogRef: MatDialogRef<ImagePreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    if (this.data && this.data.file) {
      this.selectedFile = this.data.file;
      this.updatePreview();
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      this.selectedFile = event.target.files[0];
      this.updatePreview();
    }
  }

  updatePreview() {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result;
    };
    reader.readAsDataURL(this.selectedFile);
  }

  confirm() {
    this.dialogRef.close(this.selectedFile);
  }

  remove() {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  close() {
    this.dialogRef.close();
  }
}
