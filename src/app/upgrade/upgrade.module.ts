import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { UpgradeComponent } from './upgrade.component';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UpgradeRoutingModule } from './upgrade-routing.module';

@NgModule({
  imports: [
    UpgradeRoutingModule,
    CommonModule,
    RouterModule,
    MaterialModule,
    SharedComponentsModule,
  ],
  declarations: [ UpgradeComponent ]
})
export class UpgradeModule {}
