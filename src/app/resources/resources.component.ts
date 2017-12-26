import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatPaginator, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'rating' ];
  readonly resourceDb = 'resources';
  readonly ratingDb = 'ratings';
  ratingTable = [];
  rating;
  mRating;
  fRating;
  message = '';
  file: any;
  deleteDialog: any;

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
    this.getRatings();
  }

  ngAfterViewInit() {
    this.resources.paginator = this.paginator;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getResources() {
    this.couchService
      .get(this.resourceDb + '/_all_docs?include_docs=true')
      .then(data => {
        this.resources.data = data.rows.map(res => res.doc);
        this.resources.data.forEach(element => {
          element['fRating'] = 0;
          element['mRating'] = 0;
          element['sum'] = 0;
          element['timesRated'] = 0;
          this.ratingTable.forEach(e => {
            if (e['id'] === element['_id']) {
              if (e['gender'] === 'male') {
                element['mRating']++;
              } else {
                element['fRating']++;
              }
              element['timesRated']++;
              element['sum'] += parseFloat(e['rating']);
            }
          });
        });
      }, error => (this.message = 'Error'));
  }

  getRatings() {
    this.couchService
      .get(this.ratingDb + '/_all_docs?include_docs=true')
      .then(data => {
        this.ratingTable = data.rows.map(res => res.doc);
        console.log(JSON.stringify(this.ratingTable));
        this.getResources();
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
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete(this.resourceDb + '/' + resourceId + '?rev=' + resourceRev)
        .then((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

}
