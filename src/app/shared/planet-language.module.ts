import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLanguageComponent } from './planet-language.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { PlanetDialogsModule } from './dialogs/planet-dialogs.module';

@NgModule({
  imports: [
    CommonModule, MaterialModule, PlanetDialogsModule
  ],
  exports: [
    PlanetLanguageComponent, SubmitDirective
  ],
  declarations: [
    PlanetLanguageComponent, SubmitDirective
  ]
})
export class PlanetLanguageModule {}
