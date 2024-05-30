import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { switchMap, takeUntil, auditTime } from 'rxjs/operators';
import { CertificationsService } from './certifications.service';
import { TableState } from '../../users/users-table.component';
import { CoursesService } from '../../courses/courses.service';
import { UsersService } from '../../users/users.service';

@Component({
  templateUrl: './certifications-view.component.html'
})
export class CertificationsViewComponent implements OnInit, OnDestroy {

  certification: any = { courseIds: [] };
  certifiedMembers: any[] = [];
  certifiedTableState = new TableState();
  onDestroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private certificationsService: CertificationsService,
    private coursesService: CoursesService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => this.certificationsService.getCertification(paramMap.get('id'))),
      switchMap(certification => {
        this.certification = certification;
        return combineLatest(
          this.coursesService.coursesListener$(),
          this.usersService.usersListener(true),
          this.coursesService.progressListener$()
        );
      }),
      auditTime(500),
      takeUntil(this.onDestroy$)
    ).subscribe(([ courses, users, progress ]: [ any[], any[], any ]) => {
      this.setCertifiedMembers(courses, users, progress);
    });
    this.coursesService.requestCourses();
    this.usersService.requestUsers();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setCertifiedMembers(courses, users, progress) {
    if (this.certification.courseIds.length === 0 || !progress) {
      return;
    }
    const certificateCourses = courses
      .filter(course => this.certification.courseIds.indexOf(course._id) > -1)
      .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
    this.certifiedMembers = users
      .filter(user => certificateCourses.every(course => this.certificationsService.isCourseCompleted(course, user)));
  }

  routeToEdit(certificationId) {
    this.router.navigate([ '../../update', certificationId ], { relativeTo: this.route });
  }

}
