import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { HealthListComponent } from './health-list.component';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { HealthListRoutingModule } from './health-list-routing.module';
import { UsersTableModule } from '../users/users-table.module';

@NgModule({
  imports: [
    HealthListRoutingModule,
    CommonModule,
    RouterModule,
    FormsModule,
    MaterialModule,
    SharedComponentsModule,
    UsersTableModule,
  ],
  declarations: [ HealthListComponent ]
})
export class HealthListModule {}
