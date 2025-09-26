import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MaterialModule } from '../../shared/material.module';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { UsersAchievementsComponent } from './users-achievements.component';
import { UsersAchievementsUpdateComponent } from './users-achievements-update.component';
import { UnsavedChangesGuard } from '../../shared/unsaved-changes.guard';

const routes: Routes = [
  { path: '', component: UsersAchievementsComponent },
  { path: 'update', component: UsersAchievementsUpdateComponent, canDeactivate: [ UnsavedChangesGuard ] }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    PlanetFormsModule,
    SharedComponentsModule,
    ClipboardModule
  ],
  declarations: [
    UsersAchievementsUpdateComponent,
    UsersAchievementsComponent
  ]
})
export class UsersAchievementsModule {}
