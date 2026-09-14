import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SubmissionsComponent } from '../../submissions/submissions.component';

@Component({
  selector: 'planet-courses-submissions',
  templateUrl: './courses-submissions.component.html',
  imports: [ SubmissionsComponent ]
})
export class CoursesSubmissionsComponent {

  // courseSubmissionsResolver authorizes the course and resolves it before this route activates.
  course = this.route.snapshot.data.course;
  courseId = this.course?._id;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  navigateBack() {
    this.router.navigate([ '/courses' ]);
  }

}
