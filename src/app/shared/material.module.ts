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
  MatNativeDateModule,
  MatCardModule,
  MatMenuModule,
  MatListModule
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
    MatNativeDateModule,
    MatCardModule,
    MatMenuModule,
    MatListModule
  ]
})
export class MaterialModule {}
