import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { AlertsDeleteComponent } from './alerts-delete.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    AlertsDeleteComponent
  ],
  declarations: [
    AlertsDeleteComponent
  ],
  entryComponents: [
    AlertsDeleteComponent
  ]
})
export class PlanetAlertsModule {}
