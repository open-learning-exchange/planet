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
  MatToolbarModule,
  MatRadioModule,
  MatCheckboxModule,
  MatGridListModule,
  MatNativeDateModule
} from '@angular/material';
import { MatDatepickerModule } from '@angular/material/datepicker';

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
    MatToolbarModule,
    MatRadioModule,
    MatCheckboxModule,
    MatGridListModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class MaterialModule {}
