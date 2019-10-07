import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  template: `<planet-resources-viewer [resourceId]="data.resourceId"></planet-resources-viewer>`
})
export class DialogsResourcesViewerComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

}
