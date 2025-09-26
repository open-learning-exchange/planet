import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ImageCropperModule } from 'ngx-image-cropper';
import { UsersComponent } from './users.component';
import { UsersArchiveComponent } from './users-archive/users-archive.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';
import { UsersRouterModule } from './users-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UsersAchievementsModule } from './users-achievements/users-achievements.module';
import { UsersTableModule } from './users-table.module';
import { UserProfileDialogComponent } from './users-profile/users-profile-dialog.component';

@NgModule({
  exports: [
    UsersComponent,
    UsersTableModule
  ],
  imports: [
    UsersRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule,
    UsersAchievementsModule,
    ImageCropperModule,
    UsersTableModule
  ],
  declarations: [
    UsersComponent,
    UsersArchiveComponent,
    UsersProfileComponent,
    UsersUpdateComponent,
    UserProfileDialogComponent
  ]
})
export class UsersModule {}
