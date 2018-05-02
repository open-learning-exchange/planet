import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';

@Component({
  templateUrl: './courses-view.component.html',
  styles: [ `
  .view-container {
    display: grid;
    height: calc(100vh - 352px);
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "detail view";
  }

  .course-detail {
    grid-area: detail;
    padding: 1rem;
  }

  .course-view {
    grid-area: view;
  }

  .course-detail, .course-view {
    overflow: auto;
  }
  ` ]
})

export class CoursesViewComponent implements OnInit {

  courseDetail: any = {};
  parent = this.route.snapshot.data.parent;

  constructor(
    private router: Router,
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.subscribe(course => this.courseDetail = course);
    this.route.paramMap.subscribe(
      (params: ParamMap) => this.coursesService.requestCourse(params.get('id')),
      error => console.log(error)
    );
  }

  viewStep() {
    this.router.navigate([ './step/1' ], { relativeTo: this.route });
  }

}
