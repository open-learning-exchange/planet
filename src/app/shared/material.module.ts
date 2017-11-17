import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatDialogModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { MatFormFieldModule, MatInputModule, MatPaginatorModule, MatSortModule } from '@angular/material';
@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatPaginatorModule, MatSortModule
  ]
})
export class MaterialModule {}
