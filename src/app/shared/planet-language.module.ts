import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLanguageComponent } from './planet-language.component';
import { MaterialModule } from './material.module';
import { PlanetDialogsModule } from './dialogs/planet-dialogs.module';

@NgModule({
  imports: [
    CommonModule, MaterialModule, PlanetDialogsModule
  ],
  exports: [
    PlanetLanguageComponent
  ],
  declarations: [
    PlanetLanguageComponent
  ]
})
export class PlanetLanguageModule {}
