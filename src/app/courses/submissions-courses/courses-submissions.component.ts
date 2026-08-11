import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { UserService } from '../../shared/user.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { NgTemplateOutlet } from '@angular/common';
import { SubmissionsComponent } from '../../submissions/submissions.component';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';
import { TruncateTextPipe } from '../../shared/truncate-text.pipe';

@Component({
  selector: 'planet-courses-submissions',
  templateUrl: './courses-submissions.component.html',
  styleUrls: ['./courses-submissions.component.scss'],
  imports: [
    MatToolbar,
    MatIconAnchor,
    MatIcon,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    NgTemplateOutlet,
    SubmissionsComponent,
    PlanetLoadingSpinnerComponent,
    TruncateTextPipe
  ]
})
export class CoursesSubmissionsComponent implements OnInit, OnDestroy {

  courseId: string;
  course: any;
  headingStart = '';
  canManage = false;
  isLoading = true;
  deviceType: DeviceType;
  deviceTypes = DeviceType;
  onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private userService: UserService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe((params: ParamMap) => {
      this.courseId = params.get('id');
      if (this.courseId) {
        this.coursesService.requestCourse({ courseId: this.courseId, forceLatest: true });
      }
    });

    this.coursesService.courseUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(({ course }) => {
      this.course = course;
      this.headingStart = course ? course.courseTitle : '';
      const currentUser = this.userService.get();
      this.canManage = (currentUser.isUserAdmin) ||
        (course?.creator !== undefined && currentUser.name === course.creator.slice(0, course.creator.indexOf('@')));
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

}
