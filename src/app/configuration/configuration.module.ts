import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { ConfigurationComponent } from './configuration.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PlanetFormsModule,
        MaterialModule,
    ],
    declarations: [
        ConfigurationComponent
    ],
    exports: [
        ConfigurationComponent
    ]
})
export class ConfigurationModule {}
