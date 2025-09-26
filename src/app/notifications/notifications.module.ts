import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NotificationsComponent } from './notifications.component';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { NotificationsRoutingModule } from './notifications-routing.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';

@NgModule({
  imports: [
    NotificationsRoutingModule,
    CommonModule,
    RouterModule,
    MaterialModule,
    SharedComponentsModule,
    PlanetDialogsModule,
  ],
  declarations: [ NotificationsComponent ]
})
export class NotificationsModule {}
