import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { isAcceptableFile, normalizedContentType, safeAttachmentName, truncateText } from '../utils';

interface FileMeta {
  icon: string;
  label: string;
}

export interface ExistingAttachment {
  name: string;
  contentType?: string;
  url?: string;
  size?: number;
}

export interface PendingAttachment {
  file: File;
  originalName: string;
  safeName: string;
  contentType: string;
  previewUrl?: string;
}

export interface AttachmentInputState {
  retained: ExistingAttachment[];
  removed: ExistingAttachment[];
  added: PendingAttachment[];
}

@Component({
  selector: 'planet-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: [ './file-upload.component.scss' ],
  imports: [ NgIf, NgFor, MatIcon, MatIconButton ]
})
export class FileUploadComponent implements OnChanges, OnDestroy {

  @Input() accept = '';
  @Input() hint = $localize`PDF, EPUB, ZIP, audio, video or image — up to 512 MB`;
  @Input() typePills: string[] = [ 'PDF', 'EPUB', 'ZIP', 'MP3', 'MP4', 'IMG' ];
  @Input() multiple = false;
  @Input() maxFiles = 1;
  @Input() imagePreview = false;
  @Input() existingAttachments: ExistingAttachment[] = [];
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<void>();
  @Output() fileRejected = new EventEmitter<File>();
  @Output() stateChange = new EventEmitter<AttachmentInputState>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  added: PendingAttachment[] = [];
  retained: ExistingAttachment[] = [];
  removed: ExistingAttachment[] = [];
  isDragging = false;
  errorMessage = '';

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
    webp: { icon: 'image', label: $localize`Image` },
    doc: { icon: 'description', label: $localize`Document` },
    docx: { icon: 'description', label: $localize`Document` },
    ppt: { icon: 'slideshow', label: $localize`Slides` },
    pptx: { icon: 'slideshow', label: $localize`Slides` },
    txt: { icon: 'article', label: $localize`Text` }
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes.existingAttachments) {
      this.retained = [ ...this.existingAttachments ];
      this.removed = [];
      this.emitState();
    }
  }

  ngOnDestroy() {
    this.revokePreviews(this.added);
  }

  get canAddFiles(): boolean {
    return this.retained.length + this.added.length < this.maxFiles;
  }

  truncateAttachmentName(name: string): string {
    return truncateText(name, 40);
  }

  getFileMeta(name: string): FileMeta {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return this.fileTypeMap[ext] || { icon: 'insert_drive_file', label: (ext || 'FILE').toUpperCase().slice(0, 4) };
  }

  formattedSize(size?: number): string {
    if (!size) {
      return '';
    }
    return size > 1048576
      ? `${(size / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  openPicker() {
    this.fileInput.nativeElement.click();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
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
    this.addFiles(event.dataTransfer?.files || null);
  }

  removeAdded(index: number) {
    const [ attachment ] = this.added.splice(index, 1);
    this.revokePreviews(attachment ? [ attachment ] : []);
    this.resetInputValue();
    this.fileRemoved.emit();
    this.emitState();
  }

  removeExisting(index: number) {
    const [ attachment ] = this.retained.splice(index, 1);
    if (attachment) {
      this.removed = [ ...this.removed, attachment ];
      this.emitState();
    }
  }

  clear() {
    this.revokePreviews(this.added);
    this.added = [];
    this.errorMessage = '';
    this.resetInputValue();
    this.emitState();
  }

  private addFiles(fileList: FileList | null) {
    this.errorMessage = '';
    const files = Array.from(fileList || []);
    if (!files.length) {
      return;
    }
    const availableSlots = Math.max(0, this.maxFiles - this.retained.length - this.added.length);
    const candidateFiles = (this.multiple ? files : files.slice(0, 1)).slice(0, availableSlots);
    if (!candidateFiles.length) {
      this.errorMessage = $localize`Maximum file count reached`;
      this.resetInputValue();
      return;
    }
    const pending: PendingAttachment[] = [];
    candidateFiles.forEach(file => {
      if (!isAcceptableFile(file, this.accept)) {
        this.errorMessage = $localize`File type not allowed`;
        this.fileRejected.emit(file);
        return;
      }
      pending.push(this.createPendingAttachment(file, pending));
    });
    if (!pending.length) {
      this.resetInputValue();
      return;
    }
    if (!this.multiple) {
      this.revokePreviews(this.added);
      this.added = [];
    }
    this.added = [ ...this.added, ...pending ];
    this.fileSelected.emit(pending[0].file);
    this.emitState();
    this.resetInputValue();
  }

  private createPendingAttachment(file: File, pending: PendingAttachment[]): PendingAttachment {
    const contentType = normalizedContentType(file);
    return {
      file,
      originalName: file.name,
      safeName: this.createSafeAttachmentName(file.name, pending),
      contentType,
      previewUrl: this.imagePreview && contentType.startsWith('image/') ? URL.createObjectURL(file) : undefined
    };
  }

  private createSafeAttachmentName(name: string, pending: PendingAttachment[]): string {
    return safeAttachmentName(name, [
      ...this.retained.map(attachment => attachment.name),
      ...(this.multiple ? this.added.map(attachment => attachment.safeName) : []),
      ...pending.map(attachment => attachment.safeName)
    ]);
  }

  private emitState() {
    this.stateChange.emit({
      retained: [ ...this.retained ],
      removed: [ ...this.removed ],
      added: [ ...this.added ]
    });
  }

  private revokePreviews(attachments: PendingAttachment[]) {
    attachments.forEach(attachment => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  }

  private resetInputValue() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

}
