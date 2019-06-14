import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { NewsComponent } from './news.component';
import { NewsListComponent } from './news-list.component';
import { NewsListItemComponent } from './news-list-item.component';

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
    NewsComponent,
    NewsListComponent,
    NewsListItemComponent
  ]
})
export class NewsModule {}
