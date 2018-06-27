import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { ConfigurationRouterModule } from './configuration-router.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ConfigurationComponent } from './configuration.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PlanetFormsModule,
        ConfigurationRouterModule,
        MaterialModule,
        HttpClientModule,
        HttpClientJsonpModule,
        PlanetDialogsModule
    ],
    declarations: [
        ConfigurationComponent
    ],
    exports: [
        ConfigurationComponent
    ]
})
export class ConfigurationModule {}
