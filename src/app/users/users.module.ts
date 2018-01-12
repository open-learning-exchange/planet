import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { UsersComponent } from './users.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';
import { UsersRouterModule } from './users-router.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    UsersRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule
  ],
  declarations: [
    UsersComponent,
    UsersProfileComponent,
    UsersUpdateComponent
  ]
})
export class UsersModule {}
