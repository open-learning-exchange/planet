import { Injectable } from '@angular/core';

// Used to communicate between add exam component and add course component.
// One way communication which gives exam component access to current course
// being added.
@Injectable()
export class CoursesService {

  course: any;
  stepIndex: any;
  returnUrl: string;

  reset() {
    this.course = false;
    this.stepIndex = false;
    this.returnUrl = '';
  }

}
