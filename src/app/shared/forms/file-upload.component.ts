import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { isAcceptableFile, truncateText } from '../utils';

interface FileMeta {
  icon: string;
  label: string;
}

@Component({
  selector: 'planet-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: [ './file-upload.component.scss' ],
  imports: [ NgIf, NgFor, MatIcon, MatIconButton ]
})
export class FileUploadComponent {

  @Input() accept = '';
  @Input() hint = $localize`PDF, EPUB, ZIP, audio, video or image — up to 512 MB`;
  @Input() typePills: string[] = [ 'PDF', 'EPUB', 'ZIP', 'MP3', 'MP4', 'IMG' ];
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<void>();
  @Output() fileRejected = new EventEmitter<File>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  file: File | null = null;
  isDragging = false;

  private readonly fileTypeMap: { [ext: string]: FileMeta } = {
    pdf: { icon: 'picture_as_pdf', label: $localize`PDF` },
    zip: { icon: 'folder_zip', label: $localize`ZIP` },
    epub: { icon: 'menu_book', label: $localize`EPUB` },
    mp3: { icon: 'audiotrack', label: $localize`Audio` },
    wav: { icon: 'audiotrack', label: $localize`Audio` },
    mp4: { icon: 'movie', label: $localize`Video` },
    mov: { icon: 'movie', label: $localize`Video` },
    png: { icon: 'image', label: $localize`Image` },
    jpg: { icon: 'image', label: $localize`Image` },
    jpeg: { icon: 'image', label: $localize`Image` },
    gif: { icon: 'image', label: $localize`Image` },
    doc: { icon: 'description', label: $localize`Document` },
    docx: { icon: 'description', label: $localize`Document` },
    ppt: { icon: 'slideshow', label: $localize`Slides` },
    pptx: { icon: 'slideshow', label: $localize`Slides` },
    txt: { icon: 'article', label: $localize`Text` }
  };

  get fileMeta(): FileMeta {
    const ext = this.file?.name.split('.').pop()?.toLowerCase() || '';
    return this.fileTypeMap[ext] || { icon: 'insert_drive_file', label: (ext || 'FILE').toUpperCase().slice(0, 4) };
  }

  get displayName(): string {
    return this.file ? truncateText(this.file.name, 40) : '';
  }

  get formattedSize(): string {
    if (!this.file) {
      return '';
    }
    const bytes = this.file.size;
    return bytes > 1048576
      ? `${(bytes / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  openPicker() {
    this.fileInput.nativeElement.click();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files && input.files.length ? input.files[0] : null);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length) {
      this.setFile(files[0]);
    }
  }

  remove() {
    this.clear();
    this.fileRemoved.emit();
  }

  clear() {
    this.file = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private setFile(file: File | null) {
    if (file && !isAcceptableFile(file, this.accept)) {
      this.fileRejected.emit(file);
      return;
    }
    this.file = file;
    if (file) {
      this.fileSelected.emit(file);
    }
  }

}
