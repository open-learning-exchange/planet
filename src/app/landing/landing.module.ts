import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material.module';

import { LandingComponent } from './landing.component';
import { LandingFooterComponent } from './landing-footer/landing-footer.component';

@NgModule({
  imports: [
    // CommonModule,
    // FormsModule,
    // ReactiveFormsModule,
    MaterialModule
  ],
  declarations: [
    LandingComponent,
    LandingFooterComponent
  ],
  exports: [ LandingComponent ]
})
export class LandingModule {}
