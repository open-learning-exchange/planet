import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ResourcesComponent } from '../../resources/resources.component';
import { ResourcesAddComponent } from '../../resources/resources-add.component';

@Component({
  templateUrl: 'dialogs-add-resources.component.html'
})
export class DialogsAddResourcesComponent {

  @ViewChild(ResourcesComponent) resourcesComponent: ResourcesComponent;
  @ViewChild(ResourcesAddComponent) resourcesAddComponent: ResourcesAddComponent;
  view: 'resources' | 'resourcesAdd' = 'resources';

  constructor(
    public dialogRef: MatDialogRef<DialogsAddResourcesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ok() {
    switch (this.view) {
      case 'resources':
        this.addExistingResources();
        break;
      case 'resourcesAdd':
        this.submitNewResource();
        break;
    }
  }

  addExistingResources() {
    const tableData = this.resourcesComponent.resources.data;
    const selection = this.resourcesComponent.selection.selected;
    const resources = tableData.filter((resource: any) => selection.indexOf(resource._id) > -1);
    this.data.okClick(resources);
  }

  submitNewResource() {
    this.resourcesAddComponent.onSubmit();
  }

  addNewResource(resource) {
    this.data.okClick([ { _id: resource.id } ]);
  }

  toggleNewOrExisting() {
    this.view = this.view === 'resources' ? 'resourcesAdd' : 'resources';
  }

}
