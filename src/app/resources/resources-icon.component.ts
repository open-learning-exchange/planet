import { Component, Input, OnChanges } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

export interface ResourceIconInfo {
  icon: string;
  tooltip: string;
  category: string;
}

export function resolveResourceIconInfo(resource: any): ResourceIconInfo {
  if (!resource) {
    return { icon: '', tooltip: '', category: 'none' };
  }

  const doc = resource.doc || resource;
  const attachments = doc._attachments || {};
  const attachmentKeys = Object.keys(attachments);
  const matchedKey = attachmentKeys.find(
    key => key.toLowerCase() === (typeof doc.filename === 'string' ? doc.filename.toLowerCase().trim() : '')
  ) || (attachmentKeys.length === 1 ? attachmentKeys[0] : '');
  const rawFilename = matchedKey || doc.filename || (typeof doc.name === 'string' ? doc.name : '');
  const primaryFilename = (typeof rawFilename === 'string' ? rawFilename : '').toLowerCase().trim();

  const hasDirectFile = !!doc.file || (typeof File !== 'undefined' && doc instanceof File);
  const hasAttachments = attachmentKeys.length > 0;
  const hasFilename = primaryFilename.length > 0 && primaryFilename.includes('.');

  // Resources without an attached file should not have an icon
  if (!hasAttachments && !hasDirectFile && !hasFilename) {
    return { icon: '', tooltip: '', category: 'none' };
  }

  const attachmentObj = matchedKey ? attachments[matchedKey] : (attachments[primaryFilename] || attachments[rawFilename]);
  const attachmentContentType = attachmentObj?.content_type ? attachmentObj.content_type.toLowerCase() : '';
  const directContentType = (
    doc.contentType || doc.content_type || (doc.file && doc.file.type) || (typeof doc.type === 'string' ? doc.type : '') || ''
  ).toLowerCase();
  const contentType = (attachmentContentType || directContentType).split(';')[0].trim();

  const mediaType = (typeof doc.mediaType === 'string' ? doc.mediaType : '').toLowerCase().trim();
  const openWith = (typeof doc.openWith === 'string' ? doc.openWith : '').toLowerCase().trim();

  // 1. Interactive HTML / Web Modules / Multi-attachment bundles
  if (
    attachmentKeys.length > 1 ||
    mediaType === 'html' ||
    openWith === 'html' ||
    contentType === 'text/html' ||
    contentType === 'application/xhtml+xml' ||
    primaryFilename.endsWith('.html') ||
    primaryFilename.endsWith('.htm')
  ) {
    return { icon: 'language', tooltip: $localize`:@@resource-type-html:Interactive Web Resource`, category: 'html' };
  }

  // 2. PDF Document
  if (
    contentType === 'application/pdf' ||
    primaryFilename.endsWith('.pdf') ||
    mediaType === 'pdf' ||
    openWith === 'pdf.js'
  ) {
    return { icon: 'picture_as_pdf', tooltip: $localize`:@@resource-type-pdf:PDF Document`, category: 'pdf' };
  }

  // 3. Video
  if (
    contentType.startsWith('video/') ||
    mediaType === 'video' ||
    openWith.includes('video') ||
    /\.(mp4|webm|ogv|mkv|mov|avi|flv|wmv|m4v)$/i.test(primaryFilename)
  ) {
    return { icon: 'videocam', tooltip: $localize`:@@resource-type-video:Video`, category: 'video' };
  }

  // 4. Audio
  if (
    contentType.startsWith('audio/') ||
    mediaType === 'audio' ||
    mediaType.includes('audio') ||
    openWith === 'mp3' ||
    openWith === 'bell-reader' ||
    /\.(mp3|ogg|wav|aac|m4a|flac|wma|opus)$/i.test(primaryFilename)
  ) {
    return { icon: 'audiotrack', tooltip: $localize`:@@resource-type-audio:Audio Recording`, category: 'audio' };
  }

  // 5. Spreadsheet / Dataset
  if (
    contentType === 'text/csv' ||
    contentType === 'text/comma-separated-values' ||
    contentType === 'application/csv' ||
    contentType === 'application/vnd.ms-excel' ||
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.oasis.opendocument.spreadsheet' ||
    mediaType === 'csv' ||
    /\.(csv|tsv|xls|xlsx|ods)$/i.test(primaryFilename)
  ) {
    return { icon: 'grid_on', tooltip: $localize`:@@resource-type-spreadsheet:Spreadsheet / Dataset`, category: 'spreadsheet' };
  }

  // 6. Image / Graphic
  if (
    contentType.startsWith('image/') ||
    mediaType === 'image' ||
    mediaType.includes('graphic') ||
    mediaType.includes('picture') ||
    /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff)$/i.test(primaryFilename)
  ) {
    return { icon: 'image', tooltip: $localize`:@@resource-type-image:Image`, category: 'image' };
  }

  // 7. Word Processing Document
  if (
    contentType === 'application/msword' ||
    contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/vnd.oasis.opendocument.text' ||
    contentType === 'application/rtf' ||
    /\.(doc|docx|odt|rtf)$/i.test(primaryFilename)
  ) {
    return { icon: 'description', tooltip: $localize`:@@resource-type-word:Word Document`, category: 'word' };
  }

  // 8. Presentation / Slides
  if (
    contentType === 'application/vnd.ms-powerpoint' ||
    contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    contentType === 'application/vnd.oasis.opendocument.presentation' ||
    /\.(ppt|pptx|odp)$/i.test(primaryFilename)
  ) {
    return { icon: 'slideshow', tooltip: $localize`:@@resource-type-presentation:Presentation / Slides`, category: 'presentation' };
  }

  // 9. Text / Markdown / Code
  if (
    contentType === 'text/plain' ||
    contentType === 'text/markdown' ||
    contentType === 'application/json' ||
    contentType === 'application/xml' ||
    contentType === 'text/xml' ||
    mediaType === 'text' ||
    /\.(txt|md|markdown|json|xml|log)$/i.test(primaryFilename)
  ) {
    return { icon: 'description', tooltip: $localize`:@@resource-type-text:Text Document`, category: 'text' };
  }

  // 10. Compressed Archive
  if (
    contentType === 'application/zip' ||
    contentType === 'application/x-zip-compressed' ||
    contentType === 'application/x-tar' ||
    contentType === 'application/gzip' ||
    contentType === 'application/x-7z-compressed' ||
    contentType === 'application/vnd.rar' ||
    mediaType === 'zip' ||
    /\.(zip|tar|gz|7z|rar|bz2|xz)$/i.test(primaryFilename)
  ) {
    return { icon: 'archive', tooltip: $localize`:@@resource-type-archive:Compressed Archive`, category: 'archive' };
  }

  // 11. Generic File / Other Fallback
  return { icon: 'insert_drive_file', tooltip: $localize`:@@resource-type-file:File Attachment`, category: 'file' };
}

@Component({
  selector: 'planet-resource-icon',
  template: `
    @if (iconInfo.icon) {
      <mat-icon
        class="km-resource-icon resource-type-icon"
        [matTooltip]="iconInfo.tooltip"
        [attr.aria-label]="iconInfo.tooltip"
        role="img">
        {{ iconInfo.icon }}
      </mat-icon>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      line-height: 1;
    }
    .resource-type-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.25rem;
      user-select: none;
      flex-shrink: 0;
    }
  `],
  imports: [MatIcon, MatTooltip]
})
export class PlanetResourceIconComponent implements OnChanges {
  @Input() resource: any;
  iconInfo: ResourceIconInfo = { icon: '', tooltip: '', category: 'none' };

  ngOnChanges(): void {
    this.iconInfo = resolveResourceIconInfo(this.resource);
  }
}
