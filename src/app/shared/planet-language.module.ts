import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLanguageComponent } from './planet-language.component';
import { MaterialModule } from './material.module';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    PlanetLanguageComponent
  ],
  declarations: [
    PlanetLanguageComponent
  ]
})
export class PlanetLanguageModule {}
