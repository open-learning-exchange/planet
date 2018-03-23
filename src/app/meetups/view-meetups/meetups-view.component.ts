import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit {

  meetupDetail: any = {};

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getMeetup(params.get('id'))))
      .debug('Getting meetup id from parameters')
      .subscribe((meetup) => {
        this.meetupDetail = meetup;
      }, error => console.log(error));
  }

  getMeetup(id: string) {
    return this.couchService.get('meetups/' + id);
  }

}
