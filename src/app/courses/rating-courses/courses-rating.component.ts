import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RatingComponent } from '../../rating/rating.component';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UserService } from '../../shared/user.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CoursesService } from '../courses.service';

@Component({
  templateUrl: './courses-rating.component.html',
  selector: 'planet-courses-rating'
})
export class CoursesRatingComponent extends RatingComponent {

  constructor(
    private FB: FormBuilder,
    private CS: CouchService,
    private PM: PlanetMessageService,
    private US: UserService,
    private DF: DialogsFormService,
    private coursesService: CoursesService
  ) {
    super(FB, CS, PM, US, DF);
    this.ratingType = 'course';
  }

  updateService() {
    this.coursesService.updateCourses();
  }

}
