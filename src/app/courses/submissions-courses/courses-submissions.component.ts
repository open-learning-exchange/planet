import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { CoursesService } from '../courses.service';
import { SubmissionsComponent } from '../../submissions/submissions.component';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';

@Component({
  selector: 'planet-courses-submissions',
  template: `
    @if (isLoading) {
      <planet-loading-spinner text="Loading submissions..." i18n-text></planet-loading-spinner>
    } @else {
      <planet-submissions
        [courseId]="courseId"
        [courseTitle]="course.courseTitle"
        [showCourseHeader]="true"
        (backClick)="navigateBack()"
        class="km-courses-submissions">
      </planet-submissions>
    }
  `,
  imports: [ SubmissionsComponent, PlanetLoadingSpinnerComponent ]
})
export class CoursesSubmissionsComponent implements OnInit {

  course: any;
  courseId: string;
  isLoading = true;
  // Submissions are always read from the local database, so there is nothing to manage in parent context.
  parent = this.route.snapshot.data.parent === true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private couchService: CouchService,
    private coursesService: CoursesService
  ) {}

  ngOnInit() {
    const routeCourseId = this.route.snapshot.paramMap.get('id');
    if (this.parent || !routeCourseId) {
      this.navigateBack();
      return;
    }
    this.couchService.get(`courses/${routeCourseId}`).subscribe(
      (course: any) => {
        if (!this.coursesService.canManageCourse(course)) {
          this.navigateBack();
          return;
        }
        this.course = course;
        this.courseId = course._id;
        this.isLoading = false;
      },
      () => this.navigateBack()
    );
  }

  navigateBack() {
    this.router.navigate([ this.parent ? '/manager/courses' : '/courses' ]);
  }

}
