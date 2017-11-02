import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
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

  deleteCourse(courseId, courseRev) {
    this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .then((data) => {
          this.getCourses();
        }, (error) => this.message = 'There was a problem deleting this course');
  }

  ngOnInit() {
    this.getCourses();
  }
}
