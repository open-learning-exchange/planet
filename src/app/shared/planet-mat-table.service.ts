import { Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
@Injectable()
export class PlanetMatTableService {
  selection = new SelectionModel(true, []);
  constructor(
    private router: Router
  ) { }

  isAllSelected(db) {
    const numSelected = this.selection.selected.length;
    const numRows = db.data.length;
    return numSelected === numRows;
  }

  masterToggle(db) {
    this.isAllSelected(db) ?
    this.selection.clear() :
    db.data.forEach(row => this.selection.select(row));
  }

  goBack(parent) {
    parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

}
