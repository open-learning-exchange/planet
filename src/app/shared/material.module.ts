import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatPaginatorModule } from '@angular/material';
import { MatInputModule } from '@angular/material';
import { MatDialogModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatPaginatorModule, MatButtonModule,  MatSelectModule,} from '@angular/material';

@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule, MatPaginatorModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSortModule, MatDialogModule ]
})
export class MaterialModule {}
