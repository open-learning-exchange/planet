import { Component, OnInit } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  message = '';
  courses = [];
<<<<<<< HEAD
<<<<<<< HEAD
  constructor(private couchService: CouchService) {}

  getCourses() {
    this.couchService.get('courses/_all_docs?include_docs=true').then(data => {
      // don't retrieve the course validator
      this.courses = data.rows.filter(
        x => x.doc._id !== '_design/course-validators'
      );
    }, error => (this.message = 'There was a problem getting the courses'));
=======
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
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
      description: ['', Validators.required],
      languageOfInstruction: '',
      memberLimit: [
        '', // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          Validators.min(1)
        ])
      ],
      courseLeader: [''],
      method: '',
      gradeLevel: '',
      subjectLevel: '',
      startDate: ['', CustomValidators.dateValidator],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator
        ])
      ],
      day: this.fb.array([]),
      startTime: ['', CustomValidators.timeValidator],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator
        ])
      ],
      location: '',
      backgroundColor: ['', CustomValidators.hexValidator],
      foregroundColor: ['', CustomValidators.hexValidator]
    });

    // set default values
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      memberLimit: 10,
      backgroundColor: '#ffffff',
      foregroundColor: '#000000'
    });
>>>>>>> Add courses list view (Fixes #83) (#107)
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
    await this.couchService.post(this.dbName, { ...courseInfo });
    this.router.navigate(['/']);
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
    private couchService: CouchService
  ) { }

  getCourses() {
    this.couchService.get('courses/_all_docs?include_docs=true')
      .then((data) => {
        // don't retrieve the course validator
        this.courses = data.rows.filter(x => x.doc._id !== '_design/course-validators');
      }, (error) => this.message = 'There was a problem getting the courses');
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
  deleteCourse(courseId, courseRev) {
    this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
      .then((data) => {
        this.getCourses();
      }, (error) => this.message = 'There was a problem deleting this course');
  }

<<<<<<< HEAD
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
  ngOnInit() {
    this.getCourses();
  }
}
