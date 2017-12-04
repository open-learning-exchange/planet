import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Headers } from '@angular/http';

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

  getResources() {
    this.couchService
      .get('resources/_all_docs?include_docs=true')
      .then(data => {
        this.resources = data.rows;
      }, error => (this.message = 'Error'));
  }
}
