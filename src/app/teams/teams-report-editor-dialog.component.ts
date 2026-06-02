import { Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatSuffix } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgFor, NgIf } from '@angular/common';
import { PlanetMarkdownTextboxComponent } from '../shared/forms/planet-markdown-textbox.component';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TeamsReportEditorData {
  defaultDates: { startDate: Date; endDate: Date };
  maxImages: number;
  report: any;
  saveReport: (result: any) => any;
  title: string;
}

@Component({
  templateUrl: './teams-report-editor-dialog.component.html',
  styleUrls: [ './teams-report-editor-dialog.component.scss' ],
  imports: [
    ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatFormField, MatLabel, MatInput, MatError,
    FormErrorMessagesComponent, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker,
    PlanetMarkdownTextboxComponent, NgIf, NgFor, MatButton, MatIconButton, MatIcon, MatDialogActions, MatDialogClose
  ]
})
export class TeamsReportEditorDialogComponent implements OnDestroy {

  readonly allowedImageTypes = [ 'image/jpeg', 'image/png', 'image/webp' ];
  readonly amountFields = [
    { name: 'beginningBalance', label: $localize`Beginning Balance` },
    { name: 'sales', label: $localize`Sales` },
    { name: 'otherIncome', label: $localize`Other Income` },
    { name: 'wages', label: $localize`Personnel` },
    { name: 'otherExpenses', label: $localize`Non-Personnel` }
  ];
  readonly maxImageSizeMb = 10;
  readonly maxImages: number;
  receiptImages: any[] = [];
  imageError = '';
  reportForm: FormGroup;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private dialogsLoadingService: DialogsLoadingService,
    public dialogRef: MatDialogRef<TeamsReportEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeamsReportEditorData
  ) {
    this.maxImages = data.maxImages;
    this.reportForm = this.fb.group({
      startDate: [ data.report.startDate || data.defaultDates.startDate, Validators.required ],
      endDate: [ data.report.endDate || data.defaultDates.endDate, [ Validators.required, CustomValidators.endDateValidator() ] ],
      description: [ data.report.description || '', Validators.required ],
      beginningBalance: [ data.report.beginningBalance ?? 0, Validators.required ],
      sales: [ data.report.sales ?? 0, [ Validators.required, Validators.min(0) ] ],
      otherIncome: [ data.report.otherIncome ?? 0, [ Validators.required, Validators.min(0) ] ],
      wages: [ data.report.wages ?? 0, [ Validators.required, Validators.min(0) ] ],
      otherExpenses: [ data.report.otherExpenses ?? 0, [ Validators.required, Validators.min(0) ] ]
    });
    this.receiptImages = this.createExistingImages(data.report);
  }

  ngOnDestroy() {
    this.receiptImages.forEach((image) => {
      if (image.file) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
  }

  get canAddMoreImages(): boolean {
    return this.receiptImages.length < this.maxImages;
  }

  openImagePicker() {
    this.imageInput?.nativeElement.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.imageError = '';
    if (files.length === 0) {
      return;
    }

    const remainingSlots = this.maxImages - this.receiptImages.length;
    const validFiles: Array<{ file: File; contentType: string }> = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const contentType = this.imageContentType(file);
      if (!contentType) {
        errors.push($localize`${file.name} is not a supported image format`);
        return;
      }
      if (file.size / 1024 / 1024 > this.maxImageSizeMb) {
        errors.push($localize`${file.name} exceeds ${this.maxImageSizeMb} MB`);
        return;
      }
      validFiles.push({ file, contentType });
    });

    validFiles.slice(0, remainingSlots).forEach(({ file, contentType }) => {
      this.receiptImages.push({
        contentType,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file)
      });
    });

    if (validFiles.length > remainingSlots) {
      errors.push($localize`Only ${remainingSlots} more image(s) can be added`);
    }

    this.imageError = errors.join(' ');
    input.value = '';
  }

  removeImage(index: number) {
    const [ image ] = this.receiptImages.splice(index, 1);
    if (image?.file) {
      URL.revokeObjectURL(image.previewUrl);
    }
    this.imageError = '';
  }

  submit() {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.dialogsLoadingService.start();
    this.data.saveReport({
      receiptImages: this.receiptImages,
      report: this.reportForm.getRawValue()
    }).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => {
      this.dialogRef.close(true);
    });
  }

  private createExistingImages(report: any): any[] {
    return (Object.entries(report?._attachments || {}) as [ string, any ][])
      .filter(([ , attachment ]) => attachment?.content_type?.startsWith('image/'))
      .sort(([ a ], [ b ]) => a.localeCompare(b))
      .map(([ attachmentKey, attachment ]) => ({
        contentType: attachment.content_type,
        name: attachmentKey,
        previewUrl: `${environment.couchAddress}/teams/${report._id}/${encodeURIComponent(attachmentKey)}`
      }));
  }

  private imageContentType(file: File) {
    const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (this.allowedImageTypes.includes(normalizedType)) {
      return normalizedType;
    }
    const extensionType = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    }[ (file.name.split('.').pop() || '').toLowerCase() ];
    return extensionType || '';
  }

}
