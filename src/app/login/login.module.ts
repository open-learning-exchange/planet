import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigurationComponent } from '../configuration/configuration.component';
import { LoginComponent } from './login.component';
import { LoginRouterModule } from './login-router.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { LoginFormComponent } from './login-form.component';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { ConfigurationGuard } from '../configuration/configuration-guard.service';
import { MatTooltipModule } from '@angular/material';

@NgModule({
  imports: [
    LoginRouterModule, FormsModule, CommonModule, MaterialModule, ReactiveFormsModule, PlanetFormsModule ],
  declarations: [
    LoginComponent, LoginFormComponent, ConfigurationComponent, LowercaseDirective
  ],
  providers: [ ConfigurationGuard ]
})
export class LoginModule { }
