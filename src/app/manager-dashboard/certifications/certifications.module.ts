import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CertificationsComponent } from './certifications.component';
import { CertificationsRouterModule } from './certifications-router.module';
import { MaterialModule } from '../../shared/material.module';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { PlanetDialogsModule } from '../../shared/dialogs/planet-dialogs.module';

@NgModule({
  declarations: [
    CertificationsComponent
  ],
  imports: [
    CommonModule,
    CertificationsRouterModule,
    MaterialModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    FormsModule,
    MatDialogModule,
    SharedComponentsModule,
    PlanetDialogsModule
  ]
})
export class CertificationsModule {}
