import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './courses.component.html',
  styleUrls: [ './courses.component.scss' ]
})
export class CoursesComponent implements OnInit {
  message = '';
  courses = [];
  constructor(
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
      this.router.navigate(['/']);
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
=======
  deleteCourse(courseId, courseRev) {
    this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
      .then((data) => {
        this.getCourses();
      }, (error) => this.message = 'There was a problem deleting this course');
>>>>>>> origin/master
  }

  ngOnInit() {
    this.getCourses();
  }
}
