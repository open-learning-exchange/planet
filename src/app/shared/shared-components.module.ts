import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    PlanetLocalStatusComponent,
    SubmitDirective
  ],
  declarations: [
    PlanetLocalStatusComponent,
    SubmitDirective
  ]
})
export class SharedComponentsModule {}
