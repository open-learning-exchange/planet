import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog } from '@angular/material';

@Component({
  templateUrl: './courses.component.html'
})
export class CoursesComponent implements OnInit, AfterViewInit {

  courses = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'title', 'action' ];
  message = '';
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
        this.courses.data = data.rows.map((course: any) => {
          return course.doc;
        }).filter((c: any) => {
          return c._id !== '_design/course-validators';
        });
      });
  }

  ngAfterViewInit() {
    this.courses.sort = this.sort;
    this.courses.paginator = this.paginator;
  }

  searchFilter(filterValue: string) {
    this.courses.filter = filterValue.trim().toLowerCase();
  }

  deleteClick(course) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteCourse(course),
        type: 'course',
        displayName: course.courseTitle
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
          this.courses.data = this.courses.data.filter((c: any) => data.id !== c._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course');
    };
  }

}
