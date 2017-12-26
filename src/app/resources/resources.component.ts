import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { findDocuments } from '../shared/mangoQueries';
import { MatTableDataSource, MatPaginator, MatDialog } from '@angular/material';

@Component({
  templateUrl: './resources.component.html'
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'rating' ];
  readonly resourceDb = 'resources';
  readonly ratingDb = 'ratings';
  ratings = [];
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

  async ngOnInit() {
    try {
      const resourcesRes = await this.getResources();
      const ratingsRes = await this.getRatings();
      this.setupList(resourcesRes, ratingsRes.docs);
    } catch (err) {
      console.log(err);
      // If the error was from the ratings, still setup the list
      if (err.url.indexOf('ratings') > -1) {
        this.setupList(resourcesRes, []);
      }
    }

  }

  ngAfterViewInit() {
    this.resources.paginator = this.paginator;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getResources() {
    return this.couchService.get(this.resourceDb + '/_all_docs?include_docs=true');
  }

  // TODO: _find will always limit the number of results, so need to use bookmark field
  // returned by query to get all results if more than 1000
  getRatings() {
    return this.couchService.post(this.ratingDb + '/_find', findDocuments({
      // Selector
      'type': 'resource',
    }, 0, [
      // Sort by
      { 'parentId': 'desc' }
    ], 100));
  }

  addRatingToResource = (id, index, ratings, ratingInfo) => {
    const rating = ratings[index];
    ratingInfo.totalRating = ratingInfo.totalRating + rating.rating;
    ratingInfo.timesRated++;
    if (rating.user.gender) {
      ratingInfo.genderCount[rating.user.gender]++;
    }
    if (ratings.length > index + 1 && ratings[index + 1].parentId === id) {
      // Ratings are sorted by resource id,
      // so this recursion will add all ratings to resource
      return this.addRatingToResource(id, index + 1, ratings, ratingInfo);
    }
    return ratingInfo;
  }

  setupList(resourcesRes, ratings) {

    this.resources.data = resourcesRes.rows.map((r: any) => {
      const resource = r.doc;
      const ratingIndex = ratings.findIndex(rating => {
        return resource._id === rating.parentId;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToResource(resource._id, ratingIndex, ratings, {
          totalRating: 0,
          timesRated: 0,
          genderCount: { male: 0, female: 0 }
        });
        return { ...resource, ...ratingInfo };
      }
      return resource;
    });

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
