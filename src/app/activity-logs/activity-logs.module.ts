import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogsRouterModule } from './activity-logs-router.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ActivityLogsComponent } from './activity-logs.component';

@NgModule({
  imports: [
    ActivityLogsRouterModule, CommonModule, MaterialModule,
    SharedComponentsModule
  ],
  declarations: [
    ActivityLogsComponent
  ]
})
export class ActivityLogsModule {}
