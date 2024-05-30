import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { NewsListComponent } from './news-list.component';
import { NewsListItemComponent } from './news-list-item.component';
import { CommunityListDialogComponent } from '../community/community-list-dialog.component';

@NgModule({
  exports: [ NewsListComponent ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    SharedComponentsModule,
    RouterModule
  ],
  declarations: [
    NewsListComponent,
    NewsListItemComponent,
    CommunityListDialogComponent
  ]
})
export class NewsModule {}
