import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatDialogModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule, MatButtonModule, MatInputModule, MatPaginatorModule, MatSortModule } from '@angular/material';

@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule, MatPaginatorModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSortModule, MatDialogModule
  ]
})
export class MaterialModule {}
