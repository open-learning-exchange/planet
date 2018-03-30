import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog } from '@angular/material';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { UserService } from '../shared/user.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { filterDropdowns, filterSpecificFields, composeFilterFunctions } from '../shared/table-helpers';
import * as constants from './constants';

@Component({
  templateUrl: './courses.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-action {
      max-width: 225px;
    }
  ` ]
})

export class CoursesComponent implements OnInit, AfterViewInit {
  selection = new SelectionModel(true, []);
  courses = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'select', 'title', 'action' ];
  message = '';
  deleteDialog: any;
  fb: FormBuilder;
  courseForm: FormGroup;
  readonly dbName = 'courses';
  parentUrl = false;
  gradeOptions: any = constants.gradeLevels;
  subjectOptions: any = constants.subjectLevels;
  filter = {
    'gradeLevel': '',
    'subjectLevel': ''
  };
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the courses filter
    this.courses.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
  }
  userId = this.userService.get()._id;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) { }

  ngOnInit() {
    forkJoin([ this.getCourses(), this.getAddedCourses() ]).subscribe((results) => {
      this.setupList(results[0].rows, results[1].docs[0] ? results[1].docs[0].courseIds || [] : []);
    }, (error) => console.log(error));
    this.courses.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'courseTitle' ]) ]);
  }

  getAddedCourses() {
    return this.couchService.post('shelf/_find', { 'selector': { '_id': this.userId } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so courses can be displayed.
      return of({ docs: [] });
    }));
  }

  setupList(courseRes, myCourses) {
    this.courses.data = courseRes.map((r: any) => {
      const course = r.doc || r;
      const myCourseIndex = myCourses.findIndex(courseId => {
        return course._id === courseId;
      });
      if (myCourseIndex > -1) {
        return { ...course, admission: true };
      }
      return { ...course,  admission: false };
    });
  }

  getCourses() {
    let opts: any = {};
    if (this.router.url === '/courses/parent') {
      this.parentUrl = true;
      opts = { domain: this.userService.getConfig().parent_domain };
    }
    return this.couchService.get('courses/_all_docs?include_docs=true', opts);
  }

  ngAfterViewInit() {
    this.courses.sort = this.sort;
    this.courses.paginator = this.paginator;
  }

  searchFilter(filterValue: string) {
    this.courses.filter = filterValue.trim().toLowerCase();
  }

  updateCourse(course) {
    const { _id: courseId } = course;
    this.router.navigate([ '/courses/update/' + course._id ]);
  }

  deleteClick(course) {
    this.openDeleteDialog(this.deleteCourse(course), 'single', course.courseTitle);
  }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteCourses(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const course = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteCourse(course);
      displayName = course.courseTitle;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'course',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteCourse(course) {
    // Return a function with course on its scope to pass to delete dialog
    return () => {
      const { _id: courseId, _rev: courseRev } = course;
      this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.courses.data = this.courses.data.filter((c: any) => data.id !== c._id);
          this.deleteDialog.close();
          this.selection.clear();
          this.planetMessageService.showAlert('Course deleted: ' + course.courseTitle);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course.');
    };
  }

  deleteCourses(courses) {
    return () => {
      const deleteArray = courses.map((course) => {
        return { _id: course._id, _rev: course._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray })
        .subscribe((data) => {
          this.getCourses();
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted selected courses');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course.');
    };
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.courses.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.courses.data.forEach(row => this.selection.select(row));
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.courses.filter = this.courses.filter ? this.courses.filter : ' ';
  }

  resetSearch() {
    this.filter = {
      'gradeLevel': '',
      'subjectLevel': ''
    };
    this.titleSearch = '';
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return Object.entries(this.filter).reduce((emptySpace, [ field, val ]) => {
      if (val) {
        return ' ';
      }
      return emptySpace;
    }, '');
  }

  courseResign(course) {
    this.couchService.get('shelf/' + this.userId)
      .subscribe((data) => {
        const myCourseIndex = data.courseIds.indexOf(course._id);
        data.courseIds.splice(myCourseIndex, 1);
        this.couchService.put('shelf/' + this.userId, data)
          .subscribe((response) => {
            console.log('success');
            this.updateAddLibrary();
            this.router.navigate([ '/' ]);
            this.planetMessageService.showAlert('Course successfully resigned');
          });
      });
  }

  courseAdmission(courseId) {
    const courseIdArray = courseId.map((data) => {
      return data._id;
    });
    this.couchService.post(`shelf/_find`, { 'selector': { '_id': this.userService.get()._id } })
      .pipe(
        map(data => {
          return { rev: { _rev: data.docs[0]._rev }, courseIds: data.docs[0].courseIds || [] };
        }),
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", and it needs to be created
        catchError(err => {
          // Observable of continues stream
          return of({ rev: {}, courseIds: [] });
        }),
        switchMap(data => {
          const courseIds = courseIdArray.concat(data.courseIds).reduce(this.dedupeShelfReduce, []);
          return this.couchService.put('shelf/' + this.userId,
            Object.assign(data.rev, { courseIds }));
        })
      ).subscribe((res) =>  {
        this.updateAddLibrary();
        this.router.navigate([ '/' ]);
        this.planetMessageService.showAlert('Course added to your dashboard');
    }, (error) => (error));
  }

  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  updateAddLibrary() {
    this.getAddedCourses().subscribe((res) => {
      this.setupList(this.courses.data, res.docs[0].courseIds);
    });
  }

}
