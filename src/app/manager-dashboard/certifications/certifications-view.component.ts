import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { switchMap, takeUntil, debounceTime, auditTime } from 'rxjs/operators';
import { CertificationsService } from './certifications.service';
import { TableState } from '../../users/users-table.component';
import { CoursesService } from '../../courses/courses.service';
import { UsersService } from '../../users/users.service';
import { StateService } from '../../shared/state.service';

@Component({
  templateUrl: './certifications-view.component.html'
})
export class CertificationsViewComponent implements OnInit, OnDestroy {

  certification: any = { courseIds: [] };
  eligibleMembers: any[] = [];
  eligibleTableState = new TableState();
  onDestroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private certificationsService: CertificationsService,
    private coursesService: CoursesService,
    private usersService: UsersService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => this.certificationsService.getCertification(paramMap.get('id'))),
      switchMap(certification => {
        this.certification = certification;
        return combineLatest(
          this.coursesService.coursesListener$(),
          this.usersService.usersListener(),
          this.coursesService.progressListener$()
        );
      }),
      auditTime(500),
      takeUntil(this.onDestroy$)
    ).subscribe(([ courses, users, progress ]: [ any[], any[], any ]) => {
      this.setEligibleMembers(courses, users, progress);
    });
    this.stateService.couchStateListener('courses_progress').subscribe(res => console.log(res));
    this.coursesService.requestCourses();
    this.usersService.requestUsers();
    this.stateService.requestData('courses_progress', 'local');
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setEligibleMembers(courses, users, progress) {
    if (this.certification.courseIds.length === 0 || !progress) {
      return;
    }
    const certificateCourses = courses
      .filter(course => this.certification.courseIds.indexOf(course._id) > -1)
      .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
    this.eligibleMembers = users.filter(user => certificateCourses.every(course => {
      const userMaxStep = course.progress.reduce((max, step) => (step.userId !== user._id || !step.passed) ? max : step.stepNum, 0);
      return userMaxStep === course.doc.steps.length;
    }));
  }

}
