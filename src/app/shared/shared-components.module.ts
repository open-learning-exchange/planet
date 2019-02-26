import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanetLocalStatusComponent } from './planet-local-status.component';
import { MaterialModule } from './material.module';
import { SubmitDirective } from './submit.directive';
import { PlanetLanguageComponent } from './planet-language.component';
import { ResourcesMenuComponent } from '../resources/view-resources/resources-menu.component';
import { BackComponent } from './back/back.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    BackComponent,
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent
  ],
  declarations: [
    BackComponent,
    PlanetLocalStatusComponent,
    SubmitDirective,
    PlanetLanguageComponent,
    ResourcesMenuComponent
  ]
})
export class SharedComponentsModule {}
