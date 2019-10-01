import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CertificationComponent } from './certification.component';
import { CertificationRouterModule } from './certification-router.module';
import { AddCertificationComponent } from './add-certification/add-certification.component';
import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { CertificationService } from './certification.service';

@NgModule({
  declarations: [
    CertificationComponent,
    AddCertificationComponent
  ],
  imports: [
    CommonModule,
    CertificationRouterModule,
    MaterialModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    FormsModule,
    MatDialogModule,
    SharedComponentsModule,
    PlanetDialogsModule
  ],
  providers: [ CertificationService ]
})
export class CertificationModule { }