import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog, MatDialogRef, PageEvent } from '@angular/material';
import { PlanetMessageService } from '../shared/planet-message.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, } from '@angular/router';
import { FormBuilder, FormGroup, } from '@angular/forms';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { switchMap, takeUntil, map } from 'rxjs/operators';
import { filterDropdowns, filterSpecificFields, composeFilterFunctions, sortNumberOrString } from '../shared/table-helpers';
import * as constants from './constants';
import { debug } from '../debug-operator';
import { SyncService } from '../shared/sync.service';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { CoursesService } from './courses.service';
import { dedupeShelfReduce, findByIdInArray } from '../shared/utils';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './courses.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-info, .mat-column-rating {
      max-width: 225px;
    }
  ` ]
})

export class CoursesComponent implements OnInit, AfterViewInit, OnDestroy {
  selection = new SelectionModel(true, []);
  selectedNotEnrolled = 0;
  selectedEnrolled = 0;
  courses = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  dialogRef: MatDialogRef<DialogsListComponent>;
  message = '';
  deleteDialog: any;
  fb: FormBuilder;
  courseForm: FormGroup;
  readonly dbName = 'courses';
  parent = this.route.snapshot.data.parent;
  displayedColumns = [ 'select', 'courseTitle', 'info', 'rating' ];
  planetConfiguration = this.stateService.configuration;
  getOpts = this.parent ? { domain: this.planetConfiguration.parentDomain } : {};
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
  user = this.userService.get();
  userShelf: any = [];
  private onDestroy$ = new Subject<void>();
  planetType = this.planetConfiguration.planetType;
  emptyData = false;

  constructor(
    private couchService: CouchService,
    private coursesService: CoursesService,
    private dialog: MatDialog,
    private dialogsListService: DialogsListService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private syncService: SyncService,
    private stateService: StateService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.setupList(this.courses.data, shelf.courseIds);
      });
   }

  ngOnInit() {
    this.getCourses();
    this.userShelf = this.userService.shelf;
    this.courses.filterPredicate = composeFilterFunctions([ filterDropdowns(this.filter), filterSpecificFields([ 'courseTitle' ]) ]);
    this.courses.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'rating':
          return item.rating.rateSum / item.rating.totalRating || 0;
        default:
          return sortNumberOrString(item, property);
      }
    };
    this.coursesService.coursesUpdated$.pipe(
      takeUntil(this.onDestroy$),
      map((courses: any) => {
        // Sort in descending createdDate order, so the new courses can be shown on the top
        courses.sort((a, b) => b.createdDate - a.createdDate);
        this.userShelf = this.userService.shelf;
        return this.setupList(courses, this.userShelf.courseIds);
      }),
      switchMap((courses: any) => this.parent ? this.couchService.localComparison(this.dbName, courses) : of(courses))
    ).subscribe((courses: any) => {
      this.courses.data = courses;
      this.emptyData = !this.courses.data.length;
    });
    this.selection.changed.subscribe(({ source }) => {
      this.countSelectNotEnrolled(source.selected);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setupList(courseRes, myCourses) {
    return courseRes.map((course: any) => {
      const myCourseIndex = myCourses.findIndex(courseId => course._id === courseId);
      course.canManage = this.user.isUserAdmin ||
        (course.creator === this.user.name + '@' + this.planetConfiguration.code);
      course.admission = myCourseIndex > -1;
      return course;
    });
  }

  getCourses() {
    this.coursesService.getCourses({ addProgress: true, addRatings: true }, this.getOpts);
  }

  ngAfterViewInit() {
    this.courses.sort = this.sort;
    this.courses.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  searchFilter(filterValue: string) {
    this.courses.filter = filterValue;
  }

  updateCourse(course) {
    const { _id: courseId } = course;
    this.router.navigate([ '/courses/update/' + course._id ]);
  }

  deleteClick(course) {
    this.openDeleteDialog(this.deleteCourse(course), 'single', course.courseTitle);
  }

  deleteSelected() {
    const selected = this.selection.selected.map(courseId => findByIdInArray(this.courses.data, courseId));
    let amount = 'many',
      okClick = this.deleteCourses(selected),
      displayName = '';
    if (selected.length === 1) {
      const course = selected[0];
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
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteCourse(course) {
    // Return a function with course on its scope to pass to delete dialog
    return () => {
      const { _id: courseId, _rev: courseRev } = course;
      this.couchService.delete('courses/' + courseId + '?rev=' + courseRev)
        .subscribe((data) => {
          this.selection.deselect(course._id);
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.courses.data = this.courses.data.filter((c: any) => data.id !== c._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('Course deleted: ' + course.courseTitle);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this course.');
    };
  }

  deleteCourses(courses) {
    return () => {
      // Delete many courses only allowed for admin, so no need to check if user is creator
      const deleteArray = courses.map((course) => {
        return { _id: course._id, _rev: course._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray }).subscribe((data: any) => {
        this.getCourses();
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage('You have deleted ' + deleteArray.length + ' courses');
      }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting courses.');
    };
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  enrollLeaveToggle(courseIds, type) {
    this.coursesService.courseAdmissionMany(courseIds, type).subscribe((res) => {
      this.countSelectNotEnrolled(this.selection.selected);
    }, (error) => ((error)));
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.courses.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
    }
  }

  countSelectNotEnrolled(selected: any) {
    const { enrolledCount, notEnrolledCount } = selected.reduce((counts: any, id) => {
      const hasSteps = this.hasSteps(id) ? 1 : 0,
        enrolled = this.userShelf.courseIds.indexOf(id) > -1 ? 1 : 0;
      return ({
        ...counts,
        enrolledCount: counts.enrolledCount + (hasSteps * enrolled),
        notEnrolledCount: counts.notEnrolledCount + (hasSteps * Math.abs(enrolled - 1))
      });
    }, { enrolledCount: 0, notEnrolledCount: 0 });
    this.selectedEnrolled = enrolledCount;
    this.selectedNotEnrolled = notEnrolledCount;
  }

  hasSteps(id: string) {
    return this.courses.data.find((course: any) => course._id === id && course.steps.length > 0);
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.courses.filter = this.courses.filter ? this.courses.filter : ' ';
  }

  resetSearch() {
    this.filter.gradeLevel = '';
    this.filter.subjectLevel = '';
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

  updateShelf(newShelf, message: string) {
    this.couchService.put('shelf/' + this.user._id, newShelf).subscribe((res) => {
      newShelf._rev = res.rev;
      this.userService.shelf = newShelf;
      this.setupList(this.courses.data, this.userShelf.courseIds);
      this.planetMessageService.showMessage(message + ' myCourses');
    }, (error) => (error));
  }

  addToCourse(courses) {
    const currentShelf = this.userService.shelf;
    const courseIds = courses.map((data) => {
      return data._id;
    }).concat(currentShelf.courseIds).reduce(dedupeShelfReduce, []);
    const message = courses.length === 1 ? courses[0].courseTitle + ' have been added to' : courses.length + ' courses have been added to';
    this.updateShelf(Object.assign({}, currentShelf, { courseIds }), message);
  }

  courseToggle(courseId, type) {
    this.coursesService.courseResignAdmission(courseId, type).subscribe((res) => {
      this.setupList(this.courses.data, this.userShelf.courseIds);
      this.countSelectNotEnrolled(this.selection.selected);
    }, (error) => ((error)));
  }

  shareCourse(type, courseIds) {
    const courses = courseIds.map(courseId => findByIdInArray(this.courses.data, courseId));
    const msg = (type === 'pull' ? 'fetch' : 'send');
    const { resources, exams } = this.coursesService.attachedItemsOfCourses(courses);
    this.syncService.confirmPasswordAndRunReplicators([
      { db: this.dbName, items: courses, type: 'pull', date: true },
      { db: 'resources', items: resources, type: 'pull', date: true },
      { db: 'exams', items: exams, type: 'pull', date: true }
    ]).subscribe((response: any) => {
      this.planetMessageService.showMessage(courses.length + ' ' + this.dbName + ' ' + 'queued to ' + msg);
    }, () => error => this.planetMessageService.showMessage(error));
  }

  openSendCourseDialog() {
    this.dialogsListService.getListAndColumns('communityregistrationrequests', { 'registrationRequest': 'accepted' })
    .pipe(takeUntil(this.onDestroy$))
    .subscribe((planet) => {
      const data = { okClick: this.sendCourse('courses').bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: false,
        ...planet };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data, height: '500px', width: '600px', autoFocus: false
      });
    });
  }

  sendCourse(db: string) {
    return (selected: any) => {
      const coursesToSend = this.selection.selected.map(id => findByIdInArray(this.courses.data, id));
      this.syncService.createChildPullDoc(coursesToSend, 'courses', selected[0].code).subscribe(() => {
        this.planetMessageService.showMessage('Courses queued to push to child.');
        this.dialogRef.close();
      }, () => this.planetMessageService.showAlert('There was an error sending these courses'));
    };
  }
}
