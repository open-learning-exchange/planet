import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Location } from '@angular/common';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from './custom-validators';
@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  // needs member document to implement
  members = [];
  message: String;
  readonly dbName = 'courses';

  courseForm: FormGroup;

  isWeekly = false;
  gradeLevels = [
    'Pre-Kindergarten',
    'Kindergarten',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    'College',
    'Post-Graduate'
  ];
  subjectLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  days = [
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday'
  ];

  constructor(
    private location: Location,
    private fb: FormBuilder,
    private couchService: CouchService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: ['', Validators.required],
      description: ['', Validators.required],
      languageOfInstruction: '',
      memberLimit: ['', CustomValidators.isValidNumber],
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
  }

  onSubmit() {
    this.addCourse(this.courseForm.value);
  }

  addCourse(courseInfo) {
    this.couchService.post(this.dbName, { ...courseInfo }).then(data => {
      this.checkCourseTitle(data.id, data.rev);
    });
  }

  checkCourseTitle(id, rev) {
    const courseTitle = this.courseForm.controls.courseTitle.value;
    const url = `${this
      .dbName}/_design/courses-checker/_view/courseTitles/?group=true&key="${courseTitle}"`;
    this.couchService.get(url).then(data => {
      if (data.rows[0].value > 1) {
        this.deleteCourse(id, rev);
      } else {
        this.message = 'Yay unique document';
      }
    });
  }

  deleteCourse(id, rev) {
    const url = `${this.dbName}/${id}?rev=${rev}`;
    this.couchService.delete(url).then(data => {
      console.log(data);
      this.message = 'Duplicate found so it was Successfully deleted';
    });
  }

  ngOnInit() {
    // set default values to first item in the array
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0]
    });
  }

  cancel() {
    this.courseForm.reset();
    this.location.back();
  }

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
    this.isWeekly = val;
    this.days.forEach(day => this.onDayChange(day, false));
    this.days.forEach(day => this.onDayChange(day, !val));
  }

  get courseTitle() {
    return this.courseForm.get('courseTitle');
  }
}
