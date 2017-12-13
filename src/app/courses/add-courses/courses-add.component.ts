import { Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { CourseValidatorService } from '../../validators/course-validator.service';
import * as constants from '../constants';
import { MatFormField, MatFormFieldControl } from '@angular/material';


@Component({
  templateUrl: 'courses-add.component.html'
})
export class CoursesAddComponent {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant

  courseForm: FormGroup;

  showDaysCheckBox = true; // for toggling the days checkbox

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  days = constants.days;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private courseValidatorService: CourseValidatorService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.courseValidatorService.checkCourseExists$(ac)
      ],
      description: [ '', Validators.required ],
      languageOfInstruction: '',
      memberLimit: [
        '', // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          Validators.min(1)
        ])
      ],
      courseLeader: [ '' ],
      method: '',
      gradeLevel: '',
      subjectLevel: '',
      startDate: [ '', CustomValidators.dateValidator ],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator
        ])
      ],
      day: this.fb.array([]),
      startTime: [ '', CustomValidators.timeValidator ],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator
        ])
      ],
      location: '',
      backgroundColor: [ '', CustomValidators.hexValidator ],
      foregroundColor: [ '', CustomValidators.hexValidator ]
    });

    // set default values
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      memberLimit: 10,
      backgroundColor: '#ffffff',
      foregroundColor: '#000000'
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      this.addCourse(this.courseForm.value);
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  async addCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    try {
      await this.couchService.post(this.dbName, { ...courseInfo });
      this.router.navigate([ '/courses' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  cancel() {
    this.location.back();
  }

  /* FOR TOGGLING DAILY/WEEKLY DAYS */

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = <FormArray>this.courseForm.controls.day;

    if (isChecked) {
      // add to day array if checked
      dayFormArray.push(new FormControl(day));
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(x => x.value === day);
      dayFormArray.removeAt(index);
    }
  }

  // remove old values from array on radio button change
  toogleWeekly(val: boolean) {
    // empty the array
    this.courseForm.setControl('day', this.fb.array([]));
    if (val) {
      // add all days to the array if the course is daily
      this.courseForm.setControl('day', this.fb.array(this.days));
    }
    this.showDaysCheckBox = val;
  }
}
