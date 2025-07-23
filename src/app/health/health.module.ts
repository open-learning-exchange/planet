import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { UnsavedChangesGuard } from '../shared/unsaved-changes.guard';

import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { HealthComponent } from './health.component';
import { HealthUpdateComponent } from './health-update.component';
import { HealthEventComponent } from './health-event.component';
import { HealthEventDialogComponent } from './health-event-dialog.component';

const routes: Routes = [
  { path: '', component: HealthComponent },
  { path: 'update', component: HealthUpdateComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'event', component: HealthEventComponent, canDeactivate: [UnsavedChangesGuard] }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule
  ],
  declarations: [
    HealthComponent,
    HealthUpdateComponent,
    HealthEventComponent,
    HealthEventDialogComponent
  ]
})
export class HealthModule {}
