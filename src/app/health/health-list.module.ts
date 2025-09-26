import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HealthListComponent } from './health-list.component';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { HealthListRoutingModule } from './health-list-routing.module';

@NgModule({
  imports: [
    HealthListRoutingModule,
    CommonModule,
    RouterModule,
    MaterialModule,
    SharedComponentsModule,
  ],
  declarations: [ HealthListComponent ]
})
export class HealthListModule {}
