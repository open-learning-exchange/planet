import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatButtonModule
  ]
})
export class MaterialModule {}
