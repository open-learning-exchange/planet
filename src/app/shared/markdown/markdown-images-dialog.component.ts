import { Component, DestroyRef, Inject, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler } from '@angular/material/grid-list';
import { MatButton } from '@angular/material/button';
import { defer, EMPTY } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { fuzzyWordMatch } from '@shared/search/fuzzy-search';
import {
  deepEqual, IMAGE_MAX_FALLBACK_BYTES, normalizedContentType, normalizeImage, NormalizedImage, safeAttachmentName, withImageAttachments
} from '@shared/utils';
import { FileUploadComponent } from '@shared/forms/file-upload.component';

import { environment } from '../../../environments/environment';
import { ResourcesService } from '../../resources/resources.service';

// A canvas keeps only the first frame, so GIFs are stored as uploaded
const normalizedMarkdownImage = (file: File, usedNames: string[]): Promise<NormalizedImage | null> =>
  normalizedContentType(file) === 'image/gif' ?
    Promise.resolve({ file, contentType: 'image/gif', fileName: safeAttachmentName(file.name, usedNames) }) :
    normalizeImage(file, { maxDimension: 1600, keepUnderBytes: 300 * 1024, maxFallbackBytes: 0, usedNames });

@Component({
  templateUrl: './markdown-images-dialog.component.html',
  styleUrls: ['./markdown-images-dialog.component.scss'],
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatGridList,
    MatGridTile,
    MatGridTileText,
    MatGridTileFooterCssMatStyler,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    FileUploadComponent
  ]
})
export class MarkdownImagesDialogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  images: any[] = [];
  urlPrefix = environment.couchAddress + '/resources/';
  searchQuery = '';
  @ViewChild('imageUpload') imageUpload?: FileUploadComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogRef: MatDialogRef<MarkdownImagesDialogComponent>,
    private couchService: CouchService,
    private dialogsLoadingService: DialogsLoadingService,
    private resourcesService: ResourcesService,
    private userService: UserService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.resourcesService.resourcesListener(false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resources => {
        if (resources) {
          this.images = resources.map(({ doc }) => doc)
            .filter(resource =>
              resource.mediaType === 'image' &&
              (resource.privateFor === 'community' || deepEqual(this.data.imageGroup, resource.privateFor))
            );
        }
      });
    this.resourcesService.requestResourcesUpdate(false, false);
  }

  get filteredImages() {
    return this.images.filter(image => fuzzyWordMatch(this.searchQuery, image.filename ?? ''));
  }

  uploadImage(file: File) {
    if (this.filenameExists(safeAttachmentName(file.name))) {
      this.rejectExistingFilename();
      return;
    }
    const contentType = normalizedContentType(file);
    const mediaType = this.resourcesService.simpleMediaType(contentType);
    if (mediaType !== 'image') {
      this.rejectUpload($localize`File must be an image`);
      return;
    }
    if (contentType === 'image/gif' && file.size > IMAGE_MAX_FALLBACK_BYTES) {
      this.rejectUpload($localize`GIFs can be at most 2 MB. Please select a smaller image.`);
      return;
    }
    const planet = this.stateService.configuration.code;
    const newResource = {
      createdDate: this.couchService.datePlaceholder,
      private: true,
      privateFor: this.data.imageGroup,
      sourcePlanet: planet,
      resideOn: planet,
      addedBy: this.userService.get().name,
      mediaType
    };
    this.dialogsLoadingService.start();
    defer(() => withImageAttachments(newResource, { added: [ { file } ] }, normalizedMarkdownImage)).pipe(
      switchMap(({ doc, added: [ filename ] }) => {
        if (!filename) {
          this.rejectUpload($localize`Image could not be processed. Please choose a JPEG or PNG image.`);
          return EMPTY;
        }
        // Checked again because resizing changes the extension
        if (this.filenameExists(filename)) {
          this.rejectExistingFilename();
          return EMPTY;
        }
        return this.couchService.updateDocument('resources', { ...doc, title: filename, filename }).pipe(
          map(({ id }) => ({ _id: id, filename }))
        );
      }),
      finalize(() => this.dialogsLoadingService.stop()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: image => this.selectImage(image),
      error: ({ status }) => {
        this.imageUpload?.clear();
        // CouchService already explains a 403
        if (status !== 403) {
          this.planetMessageService.showAlert($localize`There was a problem uploading the image.`);
        }
      }
    });
  }

  selectImage(image) {
    this.dialogRef.close(image);
  }

  private filenameExists(filename: string) {
    return this.images.some(image => image.filename === filename);
  }

  private rejectExistingFilename() {
    this.rejectUpload($localize`An image with that filename exists. Please rename or select another image.`);
  }

  private rejectUpload(message: string) {
    this.imageUpload?.clear();
    this.planetMessageService.showAlert(message);
  }

}

