import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

@Component({
  templateUrl: './courses-view.component.html'
})

export class CoursesViewComponent implements OnInit {

  courseDetail: any = {};

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getCourse(params.get('id'))))
      .debug('Getting course id from parameters')
      .subscribe((course) => {
        this.courseDetail = course;
      }, error => console.log(error));
  }

  getCourse(id: string) {
    return this.couchService.get('courses/' + id);
  }

}
