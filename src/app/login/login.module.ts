import { NgModule, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigurationComponent } from '../configuration/configuration.component';
import { LoginComponent } from './login.component';
import { LoginRouterModule } from './login-router.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { LoginFormComponent } from './login-form.component';
import { LowerCase } from './login-form.directive'

@NgModule({
  imports: [
    LoginRouterModule, FormsModule, CommonModule, MaterialModule, ReactiveFormsModule, PlanetFormsModule  ],
  declarations: [
    LoginComponent, LoginFormComponent, ConfigurationComponent, LowerCase

  ]
})
export class LoginModule { }
