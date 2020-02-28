import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';
import { deepEqual } from '../utils';

@Component({
  templateUrl: './dialogs-images.component.html',
  styles: [ `
    mat-grid-tile {
      width: 150px;
    }
    img {
      max-width: 150px;
      max-height: 150px;
    }
  ` ]
})
export class DialogsImagesComponent implements OnInit {

  images: any[] = [];
  urlPrefix = environment.couchAddress + '/resources/';

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

  uploadImage(event) {
    const file = event.target.files[0];
    const mediaType = this.resourcesService.simpleMediaType(file.type);
    const planet = this.stateService.configuration.code;
    if (mediaType !== 'image') {
      this.planetMessageService.showAlert('File must be an image');
      return;
    }
    const newResource = {
      title: file.name,
      filename: file.name,
      private: true,
      privateFor: this.data.imageGroup,
      sourcePlanet: planet,
      resideOn: planet,
      addedBy: this.userService.get().name,
      mediaType
    };
    this.resourcesService.updateResource(newResource, file).subscribe(([ resourceResponse ]) => {
      this.selectImage({ ...newResource, _id: resourceResponse.id });
    });
  }

  selectImage(image) {
    this.dialogRef.close(image);
  }

}

