import { NgModule } from '@angular/core';
import {
  MatFormFieldModule,
  MatButtonModule,
  MatInputModule,
  MatPaginatorModule,
  MatSortModule,
  MatTableModule,
  MatChipsModule,
  MatDialogModule,
  MatIconModule,
  MatSelectModule,
  MatRadioModule,
  MatCheckboxModule
} from '@angular/material';

@NgModule({
  exports: [
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSortModule,
    MatDialogModule,
    MatRadioModule,
    MatCheckboxModule
  ]
})
export class MaterialModule {}
