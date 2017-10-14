/** created a shared module so that i can use shared components like ListItem, FormErrors.
For more Info read the Angular Style Guide https://angular.io/guide/styleguide#!#app-structure-and-angular-modules */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ListItemComponent } from '../list-item/list-item.component';
import { FormErrorMessagesComponent } from '../form-error-messages/form-error-messages.component';

@NgModule({
  imports: [CommonModule],
  declarations: [ListItemComponent, FormErrorMessagesComponent],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ListItemComponent,
    FormErrorMessagesComponent
  ]
})
export class SharedModule {}
