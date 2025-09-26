import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UsersTableComponent } from './users-table.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    SharedComponentsModule,
    PlanetDialogsModule,
    RouterModule,
  ],
  declarations: [ UsersTableComponent ],
  exports: [ UsersTableComponent ]
})
export class UsersTableModule {}
