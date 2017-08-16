import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module'

@NgModule({
  imports: [
    HomeRouterModule,CommonModule,FormsModule
  ],
  declarations: [
    HomeComponent,DashboardComponent,NavigationComponent,UsersComponent
  ]
})
export class HomeModule {}