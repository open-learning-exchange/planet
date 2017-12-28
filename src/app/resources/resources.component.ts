import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatPaginator, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Location } from '@angular/common';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
  .list-item{
    display:flex;
  }
  /* Column Widths */
  .mat-column-select {
    max-width: 120px;
  }
  .mat-column-title {
    max-width:900px;
  }
  .mat-column-menu {
    max-width: 120px;
  }
  .mat-column-rating {
    max-width: 200px;
  }
  ` ]
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'select', 'title', 'menu', 'rating' ];
  readonly dbName = 'resources';
  mRating;
  fRating;
  message = '';
  file: any;
  deleteDialog: any;
  selection = new SelectionModel(true, []);

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private location: Location
  ) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }

  ngAfterViewInit() {
    this.resources.paginator = this.paginator;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.resources.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.data.forEach(row => this.selection.select(row));
  }

  getRating(sum, timesRated) {
    let rating = 0;
    if (sum > 0 && timesRated > 0) {
      rating = sum / timesRated;
    }
    // Multiply by 20 to convert rating out of 5 to percent for width
    return (rating * 20) + '%';
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getResources() {
    this.couchService
      .get(this.dbName + '/_all_docs?include_docs=true')
      .subscribe(data => {
        this.resources.data = data.rows.map(res => res.doc);
      }, error => (this.message = 'Error'));
  }

  deleteClick(resource) {
    this.openDeleteDialog(this.deleteResource(resource), 'single', resource.title);
  }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteResources(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      let resource = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteResource(resource);
      displayName = resource.title;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName ='') {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick,
        amount,
        type: 'resource',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete(this.dbName + '/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  deleteResources(resources) {
    return () => {
      const deleteArray = resources.map((resource) => {
        return { _id: resource._id, _rev: resource._rev, _deleted: true }
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray })
        .subscribe((data) => {
          this.getResources();
          this.selection.clear();
          this.deleteDialog.close();
        }, (error) => this.message = 'There was a problem deleting these resources.');
    }
  }

  goBack() {
    this.location.back();
  }

}
