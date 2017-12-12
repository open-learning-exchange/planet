import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatDialog } from '@angular/material';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit {
  rating;
  mRating;
  fRating;
  resources = [];
  message = '';
  file: any;
  resource = { mediaType: '' };
  deleteDialog: any;

  getRating(sum, timesRated) {
    this.rating = 0;

    if (sum > 0 && timesRated > 0) {
      const temp = (sum / timesRated).toFixed(1);
      this.rating = parseFloat(temp);
    }
    return this.rating;
  }

  constructor(private couchService: CouchService, private dialog: MatDialog) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }

  getResources() {
    this.couchService
      .get('resources/_all_docs?include_docs=true')
      .then(data => {
        this.resources = data.rows;
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
      this.couchService.delete('resources/' + resourceId + '?rev=' + resourceRev)
        .then((data) => {
          this.resources = this.resources.filter((res: any) => data.id !== res.id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

}
