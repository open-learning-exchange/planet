import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { UserService } from '../../shared/user.service';
import { CoursesService } from '../courses.service';
import { Subject } from 'rxjs/Subject';

@Component({
  templateUrl: './courses-view.component.html',
  styles: [ `
  .view-container {
    display: grid;
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

export class CoursesViewComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
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
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(course => this.courseDetail = course[0]);
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => {
        const courseId = params.get('id');
        const getOpts: any = { courseIds: [ courseId ] };
        this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true });
        this.coursesService.updateCourses(getOpts);
      }, error => console.log(error)
    );
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  viewStep() {
    this.router.navigate([ './step/1' ], { relativeTo: this.route });
  }

  admitCourse(id, admission) {
    this.coursesService.admitCourse(id, admission);
  }

}
