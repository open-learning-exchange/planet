import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators,
  ValidationErrors,
  AbstractControl
} from '@angular/forms';
import { Location } from '@angular/common';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/map';

import searchQuery, * as constants from './constants';

import { CouchService } from '../shared/couchdb.service';
@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses';

  courseForm: FormGroup;

  isWeekly = false;
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  days = constants.days;

  constructor(
    private location: Location,
    private fb: FormBuilder,
    private couchService: CouchService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        [Validators.required],
        [
          (ac: AbstractControl): Observable<ValidationErrors | null> =>
            this.checkCourseExists$(ac)
        ]
      ],
      description: ['', Validators.required],
      languageOfInstruction: '',
      memberLimit: ['', Validators.min(0)],
      courseLeader: [''],
      method: '',
      gradeLevel: '',
      subjectLevel: '',
      startDate: '',
      endDate: '',
      day: this.fb.array([]),
      startTime: '',
      endTime: '',
      location: '',
      backgroundColor: '',
      foregroundColor: ''
    });

    // set default values to first item in the array
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0]
    });
  }

  onSubmit() {
    this.addCourse(this.courseForm.value);
  }

  // TODO move validators to their own file and debounce them
  public courseCheckerService$(title: string): Observable<boolean> {
    const isDuplicate = this.couchService
      .post(`${this.dbName}/_find`, searchQuery('courseTitle', title))
      .then(data => {
        if (data.docs.length > 0) {
          return true;
        }
        return false;
      });
    return Observable.fromPromise(isDuplicate);
  }

  public checkCourseExists$(
    ac: AbstractControl
  ): Observable<ValidationErrors | null> {
    return this.courseCheckerService$(ac.value).map(res => {
      if (res) {
        return { checkCourseExists: 'Course already exists' };
      } else {
        return null;
      }
    });

    // another way of checking if course title is unique
    // this.courseForm.controls['courseTitle'].valueChanges
    //   .debounceTime(500)
    //   .subscribe(title => {
    //     this.couchService
    //       .post(`courses/_find`, this.searchQuery(title))
    //       .then(data => {
    //         if (data.docs.length === 0) {
    //           this.isUnique = true;
    //           return;
    //         }
    //         this.isUnique = false;
    //       });
    //   });
  }

  addCourse(courseInfo) {
    this.couchService.post(this.dbName, { ...courseInfo }).then(data => {
      // does not work..need to use router?
      this.location.go('/');
    });
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
    this.isWeekly = val;
  }
}
