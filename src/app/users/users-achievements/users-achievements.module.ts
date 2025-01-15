import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MaterialModule } from '../../shared/material.module';
import { PlanetFormsModule } from '../../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { UsersAchievementsComponent } from './users-achievements.component';
import { UsersAchievementsUpdateComponent } from './users-achievements-update.component';

@NgModule({
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MaterialModule, PlanetFormsModule, SharedComponentsModule, ClipboardModule
  ],
  exports: [
    UsersAchievementsUpdateComponent,
    UsersAchievementsComponent
  ],
  declarations: [
    UsersAchievementsUpdateComponent,
    UsersAchievementsComponent
  ]
})
export class UsersAchievementsModule {}
