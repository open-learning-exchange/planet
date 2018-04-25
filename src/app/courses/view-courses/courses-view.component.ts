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
    this.route.paramMap.pipe(switchMap((params: ParamMap) => this.getCourse(params.get('id'))))
      .debug('Getting course id from parameters')
      .subscribe((course) => {
        this.courseDetail = course;
      }, error => console.log(error));
  }

  getCourse(id: string) {
    if (this.parent) {
      return this.couchService.get('courses/' + id,  { domain: this.userService.getConfig().parentDomain } );
    }
    return this.couchService.get('courses/' + id);
  }

  viewStep() {
    this.coursesService.returnUrl = this.router.url;
    this.coursesService.course = this.courseDetail;
    this.coursesService.stepIndex = 0;
    this.router.navigate([ '/courses/step' ]);
  }

}
