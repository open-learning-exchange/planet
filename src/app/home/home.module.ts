import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';

import { FormErrorMessagesComponent } from '../form-error-messages/form-error-messages.component';

import { NationValidatorService } from '../validators/nation-validator.service';
import { NationComponent } from '../nation/nation.component';

@NgModule({
  imports: [HomeRouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    UsersComponent,
    CommunityComponent,
    FormErrorMessagesComponent,
    NationComponent
  ],
  providers: [ NationValidatorService ],
  exports: [ FormErrorMessagesComponent ]
})
export class HomeModule {}
