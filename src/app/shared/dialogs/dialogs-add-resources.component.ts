import { Component, Inject, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { ResourcesComponent } from '../../resources/resources.component';
import { ResourcesAddComponent } from '../../resources/resources-add.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-resources.component.html'
})
export class DialogsAddResourcesComponent implements AfterViewInit {

  @ViewChild(ResourcesComponent) resourcesComponent: ResourcesComponent;
  @ViewChild(ResourcesAddComponent) resourcesAddComponent: ResourcesAddComponent;
  view: 'resources' | 'resourcesAdd' = 'resources';
  linkInfo: any;
  okDisabled = true;
  updateResource = false;
  existingResource: any = {};
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddResourcesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.linkInfo = this.data.db ? { [this.data.db]: this.data.linkId } : undefined;
    if (this.data.resource) {
      this.updateResource = true;
      this.view = 'resourcesAdd';
      this.existingResource = { doc: this.data.resource, _id: this.data.resource._id, _rev: this.data.resource._rev };
    }
  }

  ngAfterViewInit() {
    this.initOkDisableChange();
    this.cdr.detectChanges();
  }

  ok() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
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
    // Use setTimeout to wait for Angular building the component being switched to
    setTimeout(() => this.initOkDisableChange());
  }

  initOkDisableChange() {
    switch (this.view) {
      case 'resources':
        this.resourcesComponent.selection.changed.subscribe((selection) => this.okDisabled = selection.source.selected.length === 0);
        break;
      case 'resourcesAdd':
        this.resourcesAddComponent.resourceForm.valueChanges.subscribe(
          () => this.okDisabled = !this.resourcesAddComponent.resourceForm.valid
        );
        break;
    }
  }

}
