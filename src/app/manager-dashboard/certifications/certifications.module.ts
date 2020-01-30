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
import { CertificationsAddComponent } from './certifications-add.component';
import { CoursesModule } from '../../courses/courses.module';
import { DialogsAddCoursesModule } from '../../shared/dialogs/dialogs-add-courses.module';
import { CertificationsViewComponent } from './certifications-view.component';

@NgModule({
  declarations: [
    CertificationsComponent,
    CertificationsAddComponent,
    CertificationsViewComponent
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
    PlanetDialogsModule,
    CoursesModule,
    DialogsAddCoursesModule
  ]
})
export class CertificationsModule {}
