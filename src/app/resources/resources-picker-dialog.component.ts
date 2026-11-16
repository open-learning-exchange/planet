import { Component, Inject, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';

import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { closeUnlessUnsaved, guardDialogClose, leaveUnlessUnsaved } from '@shared/unsaved-changes/dialog-close-guard';

import { ResourcesComponent } from './resources.component';
import { ResourcesAddComponent } from './resources-add.component';

@Component({
  templateUrl: 'resources-picker-dialog.component.html',
  imports: [
    CdkScrollable,
    MatDialogContent,
    ResourcesComponent,
    ResourcesAddComponent,
    MatDialogActions,
    MatButton
  ]
})
export class ResourcesPickerDialogComponent implements AfterViewInit {

  @ViewChild(ResourcesComponent) resourcesComponent: ResourcesComponent;
  @ViewChild(ResourcesAddComponent) resourcesAddComponent: ResourcesAddComponent;
  view: 'resources' | 'resourcesAdd' = 'resources';
  linkInfo: any;
  okDisabled = true;
  updateResource = false;
  existingResource: any = {};
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<ResourcesPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    guardDialogClose(this.dialogRef, this.dialog, () => this.hasUnsavedChanges(), () => this.escape());
    this.linkInfo = this.data.db ? { [this.data.db]: this.data.linkId } : undefined;
    if (this.data.resource) {
      this.updateResource = true;
      this.view = 'resourcesAdd';
      this.existingResource = { doc: this.data.resource, _id: this.data.resource._id, _rev: this.data.resource._rev };
    }
  }

  hasUnsavedChanges() {
    return this.view === 'resourcesAdd' && !this.resourcesAddComponent.canDeactivate();
  }

  cancel() {
    closeUnlessUnsaved(this.dialogRef, this.dialog, () => this.hasUnsavedChanges());
  }

  escape() {
    if (this.view === 'resourcesAdd' && !this.updateResource) {
      this.toggleNewOrExisting();
    } else {
      this.cancel();
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
    leaveUnlessUnsaved(this.dialog, () => this.hasUnsavedChanges(), () => {
      this.view = this.view === 'resources' ? 'resourcesAdd' : 'resources';
      // Use setTimeout to wait for Angular building the component being switched to
      setTimeout(() => this.initOkDisableChange());
    });
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
