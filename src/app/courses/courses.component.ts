import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
declare var jQuery: any;

@Component({
  templateUrl: './courses.component.html',
  styleUrls: [ './courses.component.scss' ]
})
export class CoursesComponent implements OnInit {
  message = '';
  courses = [];
  deleteItem = {};
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

  deleteClick(course, index) {
    // The ... is the spread operator. The below sets deleteItem a copy of the course.doc
    // object with an additional index property that is the index within the courses array
    this.deleteItem = { ...course.doc, index };
    jQuery('#planetDelete').modal('show');
  }

  deleteCourse(course) {
    const { _id: courseId, _rev: courseRev, index } = course;
    this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
      .then((data) => {
        this.getCourses();
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this course');
  }

  ngOnInit() {
    this.getCourses();
  }
}
