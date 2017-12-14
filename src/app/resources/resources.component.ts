import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';

@Component({
  templateUrl: './resources.component.html'
})

export class ResourcesComponent implements OnInit, AfterViewInit {

  resources = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'rating' ];
  readonly dbName = 'resources';
  rating;
  mRating;
  fRating;
  message = '';
  file: any;
  resource = { mediaType: '' };
  searchResource = '';

  getRating(sum, timesRated) {
    this.rating = 0;

    if (sum > 0 && timesRated > 0) {
      const temp = (sum / timesRated).toFixed(1);
      this.rating = parseFloat(temp);
    }
    return this.rating;
  }

  constructor(private couchService: CouchService) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.resources.filter = filterValue;
  }

  getResources() {
    this.couchService
      .get(this.dbName + '/_all_docs?include_docs=true')
      .then(data => {
        this.resources.data = data.rows.map(res => res.doc);
      }, error => (this.message = 'Error'));
  }

}
