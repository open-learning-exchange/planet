import { Component, Inject, ViewChild, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ResourcesComponent } from '../../resources/resources.component';
import { ResourcesAddComponent } from '../../resources/resources-add.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-resources.component.html'
})
export class DialogsAddResourcesComponent implements AfterViewChecked {

  @ViewChild(ResourcesComponent, { static: false }) resourcesComponent: ResourcesComponent;
  @ViewChild(ResourcesAddComponent, { static: false }) resourcesAddComponent: ResourcesAddComponent;
  view: 'resources' | 'resourcesAdd' = 'resources';
  linkInfo: any;
  okDisabled = true;
  updateResource = false;
  existingResource: any = {};

  constructor(
    public dialogRef: MatDialogRef<DialogsAddResourcesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private cdRef: ChangeDetectorRef
  ) {
    this.linkInfo = this.data.db ? { [this.data.db]: this.data.linkId } : undefined;
    if (this.data.resource) {
      this.updateResource = true;
      this.view = 'resourcesAdd';
      this.existingResource = { doc: this.data.resource, _id: this.data.resource._id, _rev: this.data.resource._rev };
    }
  }

  ngAfterViewChecked() {
    const okDisabled = (!this.resourcesComponent || !this.resourcesComponent.selection.selected.length) &&
      (!this.resourcesAddComponent || !this.resourcesAddComponent.resourceForm.valid);
    if (this.okDisabled !== okDisabled) {
      this.okDisabled = okDisabled;
      this.cdRef.detectChanges();
    }
  }

  ok() {
    this.dialogsLoadingService.start();
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
    this.data.okClick(this.existingResource.doc || resource === undefined ? [] : [ resource ]);
  }

  toggleNewOrExisting() {
    this.view = this.view === 'resources' ? 'resourcesAdd' : 'resources';
  }

}
