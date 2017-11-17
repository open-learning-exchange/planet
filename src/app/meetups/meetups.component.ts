import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatPaginator, MatTableDataSource, MatSort } from '@angular/material';
import { MatButtonModule } from '@angular/material/button';
declare var jQuery: any;

@Component({
  templateUrl: './meetups.component.html',
})
export class MeetupsComponent implements OnInit, AfterViewInit {
  allMeetups = new MatTableDataSource();
  title: string;
  description: string;
  displayedColumns = [ 'title', 'description', 'actions' ];
  message = '';
  meetups = [];
  deleteItem = {};

  constructor(
    private couchService: CouchService
  ) { }

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngAfterViewInit() {
    this.allMeetups.paginator = this.paginator;
    this.allMeetups.sort = this.sort;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.allMeetups.filter = filterValue;
  }
  getMeetups() {
    this.couchService.get('meetups/_all_docs?include_docs=true')
      .then((data) => {
        this.allMeetups.data = [].concat(
          data.rows.reduce((meetups: any[], meetup: any) => {
            meetups.push({ ...meetup.doc });
            return meetups;
          }, [])
        );
      }, (error) => this.message = 'There was a problem getting meetups');
  }

  deleteClick(meetup) {
    // The ... is the spread operator. The below sets deleteItem a copy of the meetup.doc
    // object with an additional index property that is the index within the meetups array
    this.deleteItem = { ...meetup };
    jQuery('#planetDelete').modal('show');
  }

  deleteMeetup(meetup) {
    const { _id: meetupId, _rev: meetupRev, index } = meetup;
    this.couchService.delete('meetups/' + meetupId + '?rev=' + meetupRev)
      .then((data) => {
        this.getMeetups();
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this meetup');
  }

  ngOnInit() {
    this.getMeetups();
  }

}
