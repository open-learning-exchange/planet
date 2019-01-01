import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './courses-compare.component.html'
})

export class CoursesCompareComponent implements OnInit {

  onDestroy$ = new Subject<void>();
  courseDetail: any = { };
  localCourse: any = { };
  isUserEnrolled = false;
  progress = [ { stepNum: 1 } ];
  fullView = 'on';

  constructor(
    private route: ActivatedRoute,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => this.fetchCourse(
        params.get('id')
      ), error => console.log(error)
    );
  }

  fetchCourse(id) {
    this.couchService.get('send_items/' + id)
    .pipe(switchMap(send => {
      this.courseDetail = send;
      this.courseDetail = send;
      return this.couchService.get('courses/' + courseId);
    }))
    .subscribe((course) => {
      this.localCourse = course;
    });
    this.coursesService.
    this.couchService.get('courses/' + courseId, opts)
    this.couchService.get('send_items/' + courseId, opts)
    this.localCourse
    this.courseDetail
  }
  
  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

}
