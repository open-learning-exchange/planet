import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxImgModule } from 'ngx-img';

import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ActivityLogsComponent } from './activity-logs.component';

@NgModule({
  imports: [
    NgxImgModule,
    CommonModule,
    MaterialModule,
    SharedComponentsModule
  ],
  declarations: [
    ActivityLogsComponent
  ]
})
export class ActivityLogsModule {}
