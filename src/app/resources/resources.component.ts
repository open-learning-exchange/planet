import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatPaginator, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
  .example-header {
  display:none;
  }
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

  constructor(private couchService: CouchService, private dialog: MatDialog) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }

  ngAfterViewInit() {
    this.resources.paginator = this.paginator;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getResources() {
    this.couchService
      .get('resources/_all_docs?include_docs=true')
      .subscribe(data => {
        this.resources.data = data.rows.map(res => res.doc);
      }, error => (this.message = 'Error'));
  }

  deleteClick(resource) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteResource(resource),
        type: 'resource',
        displayName: resource.title
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
      this.couchService.delete('resources/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  deleteSelected() {
    const resid = [];
    const rev = [];
    // this.a = this.resources.data.filter(_ => _.selected);
    // for (var row in this.selected){
    //   this.couchService.delete(this.selected[a].id)
    //   .suscribe(data =>{
    //     console.log(data)
    //   })
    // }
    for (let i = 0; i < this.resources.data.length; i++) {
      resid.push(this.resources.data[i]._id);
      rev.push(this.resources.data[i]._rev);
    }
    const docs = {
      'id': resid
    };
    this.couchService.delete('resources/' + resid + '?rev=' + rev)
    .subscribe((data) => {
      console.log(data);
    });
  }

}
