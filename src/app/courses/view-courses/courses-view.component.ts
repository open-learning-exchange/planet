import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs/Subject';
import { CoursesService } from '../../shared/services';

@Component({
  templateUrl: './courses-view.component.html',
  styles: [
    `
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
  `
  ]
})
export class CoursesViewComponent implements OnInit, OnDestroy {
  private onDestroy$: Subject<boolean> = new Subject<boolean>();
  courseDetail: any = {};
  parent = this.route.snapshot.data.parent;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CoursesService
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) =>
          this.courseService.getCourse(params.get('id'))
        )
      )
      .subscribe(course => {
        this.courseDetail = course;
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.unsubscribe();
  }

  viewStep() {
    this.router.navigate(['./step/1'], { relativeTo: this.route });
  }
}
