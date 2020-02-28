import { Component, OnInit, ViewChild, AfterViewChecked, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { composeFilterFunctions, filterDropdowns, dropdownsFill, filterSpecificFieldsByWord } from '../shared/table-helpers';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject, zip } from 'rxjs';
import { SubmissionsService } from './submissions.service';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { CoursesService } from '../courses/courses.service';

@Component({
  selector: 'planet-submissions',
  templateUrl: './submissions.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-name {
      max-width: 25vw;
    }
    .mat-column-stepNum {
      max-width: 90px;
    }
  ` ]
})
export class SubmissionsComponent implements OnInit, AfterViewChecked, OnDestroy {

  @Input() isDialog = false;
  @Input() parentId: string;
  @Input() displayedColumns = [ 'name', 'courseTitle', 'stepNum', 'status', 'user', 'lastUpdateTime' ];
  @Output() submissionClick = new EventEmitter<any>();
  submissions = new MatTableDataSource();
  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  initTable = true;
  statusOptions: any = [
    { text: 'Pending', value: 'pending' },
    { text: 'Not Graded', value: 'requires grading' },
    { text: 'Completed', value: 'complete' }
  ];
  mode = 'grade';
  emptyData = false;
  filter = {
    type: 'exam',
    status: 'requires grading'
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private submissionsService: SubmissionsService,
    private userService: UserService,
    private coursesService: CoursesService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.setMode();
    this.filter['type'] = this.route.snapshot.paramMap.get('type') || 'exam';
    if (this.mode === 'survey') {
      this.filter['type'] = 'survey';
      this.displayedColumns = this.displayedColumns.filter(col => col !== 'user');
    } else if (this.mode === 'review') {
      this.filter.status = '';
    }
    if (this.filter['type'] === 'survey') {
      this.filter['status'] = '';
    }
    this.coursesService.requestCourses();
    zip(this.submissionsService.submissionsUpdated$, this.coursesService.coursesListener$()).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ submissions, courses ]) => {
      submissions = submissions.filter(data => data.user && data.type !== 'photo' && data.parent).reduce((sList, s1) => {
        const sIndex = sList.findIndex(s => (s.parentId === s1.parentId && s.user._id === s1.user._id && s1.type === 'survey'));
        if (!s1.user._id || sIndex === -1) {
          sList.push(s1);
        } else if ((s1.parent.updatedDate || 0) > (sList[sIndex].parent.updatedDate || 0)) {
          sList[sIndex] = s1;
        }
        return sList;
      }, []).map(submission => this.appendCourseInfo(submission, courses));
      // Sort in descending lastUpdateTime order, so the recent submission can be shown on the top
      submissions.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
      this.submissions.data = submissions.map(submission => ({
        ...submission, submittedBy: this.submissionsService.submissionName(submission.user)
      }));
      this.dialogsLoadingService.stop();
      this.applyFilter('');
      this.emptyData = !this.submissions.filteredData.length;
    });
    this.submissionsService.updateSubmissions({ query: this.submissionQuery() });
    this.setupTable();
  }

  ngAfterViewChecked() {
    if (this.initTable === true) {
      this.submissions.paginator = this.paginator;
      this.submissions.sort = this.sort;
      this.initTable = false;
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setMode() {
    this.mode = this.route.snapshot.data.mySurveys === true ?
      'survey' :
      this.parentId ?
      'review' :
      'grade';
  }

  submissionQuery() {
    switch (this.mode) {
      case 'survey': return findDocuments({ 'user.name': this.userService.get().name, type: 'survey' });
      case 'review': return findDocuments({
        'user.name': this.userService.get().name, parentId: this.parentId, status: { '$ne': 'pending' }
      });
      default: return undefined;
    }
  }

  setupTable() {
    this.submissions.filterPredicate = composeFilterFunctions([
      filterSpecificFieldsByWord([ 'parent.name' ]),
      filterDropdowns(this.filter)
    ]);
    this.submissions.sortingDataAccessor = (item: any, property) => {
      switch (property) {
        case 'name': return item.parent.name.toLowerCase();
        case 'user': return item.submittedBy.toLowerCase();
        default: return typeof item[property] === 'string' ? item[property].toLowerCase() : item[property];
      }
    };
  }

  applyFilter(filterValue: string) {
    this.submissions.filter = filterValue || this.dropdownsFill();
  }

  onFilterChange(filterValue: string, field: string) {
    if (field === 'type') {
      this.filter.status = filterValue === 'exam' ? 'requires grading' : '';
    }
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.submissions.filter = this.submissions.filter || ' ';
    this.emptyData = !this.submissions.filteredData.length;
    this.initTable = !this.emptyData;
  }

  dropdownsFill() {
    return dropdownsFill(this.filter);
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  submissionAction(submission) {
    if (this.isDialog) {
      this.submissionClick.emit(submission);
      return;
    }
    if (submission.status !== 'pending' || this.mode === 'survey') {
      this.router.navigate([
        './exam',
        { submissionId: submission._id, questionNum: 1, status: submission.status, mode: this.surveyMode(this.mode, submission.type) }
      ], { relativeTo: this.route });
    }
  }

  surveyMode(listMode, submissionType) {
    if (listMode === 'survey') {
      return 'take';
    }
    if (submissionType === 'survey') {
      return 'view';
    }
    return listMode;
  }

  isNumber(value) {
    return typeof value === 'number';
  }

  nameClick(event, user) {
    if (user.name) {
      event.stopPropagation();
    }
  }

  appendCourseInfo(submission, courses) {
    const [ examId, courseId ] = submission.parentId.split('@');
    if (!courseId) {
      return submission;
    }
    const submissionCourse = courses.find(course => course._id === courseId) || { doc: { steps: [] } };
    const stepNum = submissionCourse.doc.steps
      .findIndex(step => (step.exam && step.exam._id === examId) || (step.survey && step.survey._id === examId)) + 1;
    return { ...submission, courseTitle: submissionCourse.doc.courseTitle, stepNum };
  }

}
