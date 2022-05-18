import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxImgModule } from 'ngx-img';

import { UsersComponent } from './users.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';
import { UsersRouterModule } from './users-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UsersAchievementsModule } from './users-achievements/users-achievements.module';
import { UsersTableComponent } from './users-table.component';
import { UserProfileDialogComponent } from './users-profile/users-profile-dialog.component';

@NgModule({
  exports: [
    UsersTableComponent, UsersComponent
  ],
  imports: [
    NgxImgModule,
    UsersRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule,
    UsersAchievementsModule
  ],
  declarations: [
    UsersComponent,
    UsersProfileComponent,
    UsersUpdateComponent,
    UsersTableComponent,
    UserProfileDialogComponent
  ]
})
export class UsersModule {}
