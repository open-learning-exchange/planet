import { Component, Inject, OnInit } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { environment } from '../../../environments/environment';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';
import { deepEqual } from '../utils';

@Component({
  templateUrl: './dialogs-images.component.html',
  styleUrls: [ './dialogs-images.component.scss' ]
})
export class DialogsImagesComponent implements OnInit {

  images: any[] = [];
  urlPrefix = environment.couchAddress + '/resources/';
  searchQuery = '';

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

  uploadImage(event) {
    const file = event.target.files[0];

    const sanitizedFileName = file.name.trim().replace(/\s+/g, '_');
    const imageExists = this.images.some(img => sanitizedFileName === img.filename);
    if (imageExists) {
      this.planetMessageService.showAlert($localize`An image with that filename exists. Please rename or select another image.`);
      return;
    }
    const mediaType = this.resourcesService.simpleMediaType(file.type);
    const planet = this.stateService.configuration.code;
    if (mediaType !== 'image') {
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

