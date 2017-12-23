import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { MatFormField, MatFormFieldControl } from '@angular/material';

@Component({
  templateUrl: './course-manage.component.html'
})
export class CourseManageComponent implements OnInit, OnDestroy {
  id: string;
  courseTitle: string;
  description: string;
  languageOfInstruction: string;
  memberLimit: string;
  courseLeader: string;
  method: number;
  gradeLevel: string;
  subjectLevel: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  days: any;
  location: string;
  backgroundColor: string;
  foregroundColor: string;

  _rev: string;
  _id: string;

  private sub: any;

  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant

  courseForm: FormGroup;

  showDaysCheckBox = true; // for toggling the days checkbox

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;


  constructor(
    private route: ActivatedRoute,
    private couchService: CouchService,
    private router: Router,
    private fb: FormBuilder,
    private validatorService: ValidatorService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.id = params['id'];
    });
    this.couchService.get('courses/' + this.id)
      .then((data) => {
        this._id = data._id;
        this._rev = data._rev;
        this.courseTitle = data.courseTitle;
        this.description = data.description;
        this.languageOfInstruction = data.languageOfInstruction;
        this.memberLimit = data.memberLimit;
        this.courseLeader = data.courseLeader;
        this.method = data.method;
        this.gradeLevel = data.gradeLevel;
        this.subjectLevel = data.subjectLevel;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.days = data.day;
        this.location = data.location;
        this.backgroundColor = data.backgroundColor;
        this.foregroundColor = data.foregroundColor;
      });
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        // ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac)
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
      this.updateCourse(this.courseForm.value);
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  async updateCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    try {
      courseInfo['_id'] = this.id;
      courseInfo['_rev'] = this._rev;
      await this.couchService.put(this.dbName + '/' + this.id, { ...courseInfo });
      this.router.navigate([ '/courses' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  cancel() {

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

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}

