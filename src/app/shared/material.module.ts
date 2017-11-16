import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material';
import { MatChipsModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  exports: [
    MatTableModule, MatChipsModule, MatIconModule
  ]
})
export class MaterialModule {}
