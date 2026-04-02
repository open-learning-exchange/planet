import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesModule } from '../../resources/resources.module';
import { DialogsResourcesViewerComponent } from './dialogs-resources-viewer.component';


@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        ResourcesModule,
        DialogsResourcesViewerComponent
    ],
    exports: [
        DialogsResourcesViewerComponent
    ]
})
export class DialogsResourcesViewerModule {}
