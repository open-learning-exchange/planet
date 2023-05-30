import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';

import { GptComponent } from './gpt.component';


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        PlanetFormsModule,
        SharedComponentsModule
    ],
    exports: [ GptComponent ],
    declarations: [ GptComponent ]
})
export class GptModule { }
