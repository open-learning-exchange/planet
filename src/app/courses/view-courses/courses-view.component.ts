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
  userShelf: any = [];

  constructor(
    private router: Router,
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private coursesService: CoursesService
  ) { }

  ngOnInit() {
    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(course => this.courseDetail = course);
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(
      (params: ParamMap) => this.coursesService.requestCourse({ courseId: params.get('id'), forceLatest: true }),
      error => console.log(error)
    );
    this.userShelf = this.userService.getUserShelf();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  viewStep() {
    this.router.navigate([ './step/1' ], { relativeTo: this.route });
  }

  courseAdmission() {
    this.coursesService.setCourseAdmission(this.route.snapshot.paramMap.get('id'));
  }

  courseResigin() {
    this.coursesService.setCourseResigin(this.route.snapshot.paramMap.get('id'));
  }

  isAdmission() {
     if (this.userShelf.courseIds.includes(this.route.snapshot.paramMap.get('id'))) {
       return true;
     } else {
       return false;
     }
  }

}
