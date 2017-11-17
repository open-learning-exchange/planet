import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatButtonModule, MatFormFieldModule, MatSelectModule} from '@angular/material';

@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule, MatPaginatorModule, MatButtonModule, MatFormFieldModule, MatSelectModule
  ]
})
export class MaterialModule {}
