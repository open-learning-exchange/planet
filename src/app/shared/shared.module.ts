import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ListItemComponent } from '../list-item/list-item.component';

@NgModule({
  imports: [CommonModule],
  declarations: [ListItemComponent],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, ListItemComponent]
})
export class SharedModule {}
