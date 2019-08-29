import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { ConfigurationComponent } from './configuration.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { MigrationComponent } from './migration.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PlanetFormsModule,
        MaterialModule,
        SharedComponentsModule
    ],
    declarations: [
        ConfigurationComponent,
        MigrationComponent
    ],
    exports: [
        ConfigurationComponent,
        MigrationComponent
    ]
})
export class ConfigurationModule {}
