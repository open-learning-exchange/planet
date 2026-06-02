import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';
import { deepEqual, normalizedContentType } from '../utils';
import { NgIf, NgFor } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler } from '@angular/material/grid-list';
import { MatButton } from '@angular/material/button';
import { FileUploadComponent } from '../forms/file-upload.component';

@Component({
  templateUrl: './dialogs-images.component.html',
  styleUrls: ['./dialogs-images.component.scss'],
  imports: [
    NgIf, MatDialogTitle, CdkScrollable, MatDialogContent, MatIcon, MatFormField, MatLabel,
    MatInput, FormsModule, MatGridList, NgFor, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler,
    MatDialogActions, MatButton, MatDialogClose, FileUploadComponent
  ]
})
export class DialogsImagesComponent implements OnInit {

  images: any[] = [];
  urlPrefix = environment.couchAddress + '/resources/';
  searchQuery = '';
  @ViewChild('imageUpload') imageUpload?: FileUploadComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogRef: MatDialogRef<DialogsImagesComponent>,
    private resourcesService: ResourcesService,
    private userService: UserService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.resourcesService.resourcesListener(false).subscribe(resources => {
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
    return this.images.filter(image => image.filename.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  uploadImage(file: File) {
    const sanitizedFileName = file.name.trim().replace(/\s+/g, '_');
    const imageExists = this.images.some(img => sanitizedFileName === img.filename);
    if (imageExists) {
      this.imageUpload?.clear();
      this.planetMessageService.showAlert($localize`An image with that filename exists. Please rename or select another image.`);
      return;
    }
    const mediaType = this.resourcesService.simpleMediaType(normalizedContentType(file));
    const planet = this.stateService.configuration.code;
    if (mediaType !== 'image') {
      this.imageUpload?.clear();
      this.planetMessageService.showAlert($localize`File must be an image`);
      return;
    }
    const newResource = {
      title: sanitizedFileName,
      filename: sanitizedFileName,
      private: true,
      privateFor: this.data.imageGroup,
      sourcePlanet: planet,
      resideOn: planet,
      addedBy: this.userService.get().name,
      mediaType
    };
    this.resourcesService.updateResource(newResource, file, undefined, sanitizedFileName).subscribe(([ resourceResponse ]) => {
      this.selectImage({ ...newResource, _id: resourceResponse.id });
    });
  }

  selectImage(image) {
    this.dialogRef.close(image);
  }

}

