import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { AlertsDeleteComponent } from '../shared/alerts/alerts-delete.component';
import { MatDialog } from '@angular/material';

@Component({
  templateUrl: './courses.component.html',
  styleUrls: [ './courses.component.scss' ]
})
export class CoursesComponent implements OnInit {
  message = '';
  courses = [];
  deleteDialog: any;
  constructor(
    private couchService: CouchService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.getCourses();
  }

  getCourses() {
    this.couchService.get('courses/_all_docs?include_docs=true')
      .then((data) => {
        // don't retrieve the course validator
        this.courses = data.rows.filter(x => x.doc._id !== '_design/course-validators');
      }, (error) => this.message = 'There was a problem getting the courses');
  }

  deleteClick(course) {
    this.deleteDialog = this.dialog.open(AlertsDeleteComponent, {
      data: {
        okClick: this.deleteCourse(course.doc),
        type: 'course',
        displayName: course.doc.courseTitle
      }
    });
  }

  deleteCourse(course) {
    // Return a function with course on its scope to pass to delete dialog
    return () => {
      const { _id: courseId, _rev: courseRev } = course;
      this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .then((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.courses = this.courses.filter(course => data.id !== course.doc._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course');
  }

}
