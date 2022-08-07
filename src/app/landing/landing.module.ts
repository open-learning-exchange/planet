import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';

import { LandingComponent } from './landing.component';
import { LandingHeroComponent } from './landing-hero/landing-hero.component';
import { LandingFooterComponent } from './landing-footer/landing-footer.component';

import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    // CommonModule,
    MaterialModule
  ],
  declarations: [
    LandingComponent,
    LandingHeroComponent,
    LandingFooterComponent
  ],
  exports: [ LandingComponent ]
})
export class LandingModule {}
