import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../user.service';
import { StateService } from '../state.service';
import { PlanetMessageService } from '../planet-message.service';

@Component({
  templateUrl: './dialogs-images.component.html'
})
export class DialogsImagesComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private resourcesService: ResourcesService,
    private userService: UserService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    // this.resourcesService
  }

  uploadImage(event) {
    const file = event.target.files[0];
    const mediaType = this.resourcesService.simpleMediaType(file.type);
    const planet = this.stateService.configuration.code;
    if (mediaType !== 'image') {
      this.planetMessageService.showAlert('File must be an image');
      return;
    }
    this.resourcesService.updateResource(
      {
        title: file.name,
        filename: file.name,
        private: true,
        privateFor: this.data.imageGroup,
        sourcePlanet: planet,
        resideOn: planet,
        addedBy: this.userService.get().name
      },
      file
    ).subscribe(() => {});
  }

}

