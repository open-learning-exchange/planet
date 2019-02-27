import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { LoginRouterModule } from './login-router.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { LoginFormComponent } from './login-form.component';
import { ConfigurationGuard } from '../configuration/configuration-guard.service';
import { ConfigurationModule } from '../configuration/configuration.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    LoginRouterModule,
    FormsModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ConfigurationModule,
    SharedComponentsModule
  ],
  declarations: [
    LoginComponent, LoginFormComponent
  ],
  providers: [ ConfigurationGuard ]
})
export class LoginModule { }
