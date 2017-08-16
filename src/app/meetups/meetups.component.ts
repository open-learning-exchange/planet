import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './meetups.component.html',
})
export class MeetupsComponent implements OnInit {
  message = "";
  meetups = [];	
  constructor(
  		private couchService: CouchService
  	) { }

  ngOnInit() {
  	this.couchService.get('meetups/_all_docs?include_docs=true')
        .then((data) => {
            this.meetups = data.rows;
        }, (error) => this.message = 'There was a problem getting meetups');
  }

}
