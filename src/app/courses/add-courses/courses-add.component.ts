import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { MatFormField, MatFormFieldControl } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: 'courses-add.component.html'
})
export class CoursesAddComponent implements OnInit {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { rev: '', id: '' };
  pageType = 'Add new';
  courseFrequency = [];
  radio = '';
  showDaysCheckBox = true; // for toggling the days checkbox

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  days = constants.days;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
        ? ac => this.validatorService.isNameAvailible$(this.dbName, 'courseTitle', ac, this.route.snapshot.params.id)
        : ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac)
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

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('courses/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { rev: data._rev, id: data._id };
        this.courseFrequency = data.day || [];
        this.courseForm.value.day = this.courseFrequency;
        this.courseForm.patchValue(data);

        switch (this.courseFrequency.length) {
          case 7:
            this.radio = 'daily';
            // If daily was selected, do not check any days after toggling weekly
            this.courseFrequency = [];
            /* falls through */
          case 0:
            this.showDaysCheckBox = true;
            break;
          default:
            this.showDaysCheckBox = false;
            this.radio = 'weekly';
        }

      }, (error) => {
        console.log(error);
      });
    }
  }

  updateCourse(courseInfo) {
    this.couchService.put(this.dbName + '/' + this.documentInfo.id, { ...courseInfo, '_rev': this.documentInfo.rev }).subscribe(() => {
      this.router.navigate([ '/courses' ]);
      this.planetMessageService.showMessage('Course Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateCourse(this.courseForm.value);
      } else {
        this.addCourse(this.courseForm.value);
      }
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.post(this.dbName, { ...courseInfo }).subscribe(() => {
      this.router.navigate([ '/courses' ]);
      this.planetMessageService.showMessage('New Course Added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  cancel() {
    this.router.navigate([ '/courses' ]);
  }

  isClassDay(day) {
    return this.courseFrequency.includes(day) ? true : false;
  }

  /* FOR TOGGLING DAILY/WEEKLY DAYS */

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = <FormArray>this.courseForm.controls.day;

    if (isChecked) {
      // add to day array if checked
      if (!dayFormArray.value.includes(day)) {
        dayFormArray.push(new FormControl(day));
      }
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(x => x.value === day);
      dayFormArray.removeAt(index);
    }
  }

  // remove old values from array on radio button change
  toggleDaily(val: boolean) {
    if (val) {
      // add all days to the array if the course is daily
      this.courseForm.setControl('day', this.fb.array(this.days));
    } else {
      this.courseForm.setControl('day', this.fb.array(this.courseFrequency));
    }
    this.showDaysCheckBox = val;
  }
}
