import { Component, Input, Output, EventEmitter, ElementRef, DoCheck, OnInit, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialog, MatSnackBar} from '@angular/material';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { takeUntil, tap, switchMap, finalize, catchError } from 'rxjs/operators';
import { convertUtcDate } from './teams.utils';
import { CsvService } from '../shared/csv.service';
import { NewsService } from '../news/news.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { StateService } from '../shared/state.service';
import { Subject } from 'rxjs';
import { UserService } from '../shared/user.service';
import { TeamsCommentsComponent } from './teams-comments.component';

@Component({
  selector: 'planet-teams-reports',
  styleUrls: [ './teams-reports.scss' ],
  templateUrl: './teams-reports.component.html'
})
export class TeamsReportsComponent implements DoCheck, OnInit {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() team;
  @Input() viewableId: string;
  @Output() reportsChanged = new EventEmitter<void>();
  columns = 4;
  minColumnWidth = 300;
  report: any;
  teamId: string;
  news: any[] = [];
  mode: 'team' | 'enterprise' | 'services' = this.route.snapshot.data.mode || 'team';
  commentCount: number;
  onDestroy$ = new Subject<void>();
  comments = 0;
  currentUser = this.userService.get();

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService,
    private newsService: NewsService,
    private csvService: CsvService,
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private stateService: StateService,
    private userService: UserService,
  ) {}
  
  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.teamId = params.get('teamId') || planetAndParentId(this.stateService.configuration);
      this.initTeam(this.teamId);
    });
  }

  ngDoCheck() {
    const gridElement = this.elementRef.nativeElement.children['report-grid'];
    if (!gridElement) {
      return;
    }
    const newColumns = Math.floor(gridElement.offsetWidth / this.minColumnWidth);
    if (this.columns !== newColumns) {
      this.columns = newColumns;
    }
  }

  initTeam(teamId: string) {
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe(news => {
        this.news = news.map(post => ({
        ...post, public: ((post.doc.viewIn || []).find(view => view._id === teamId) || {}).public
      }))
      this.checkNewComments(this.news)
    });
  }

  // for comment notification
  checkNewComments(news) {
    const newComments = news.filter(item => item.doc.viewedBy !== undefined);
    if(newComments.length > 0) this.comments = newComments.filter(item => !item.doc.viewedBy.includes(this.currentUser._id)).length;
    if(this.comments > 0) this.snackbar.openFromComponent(TeamsCommentsComponent, {
      data: {
        message: this.comments,
        buttonText: 'Close'
      },
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'comment-popup'
    });
  }

  // for individual comments count of the report
  showCommentsCount(report) {
    this.commentCount = this.filterCommentsFromNews(report).length;
    return this.commentCount
  }

  openAddReportDialog(oldReport = {}) {
    this.couchService.currentTime().subscribe((time: number) => {
      const currentDate = new Date(time);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = currentDate.setDate(0);
      this.dialogsFormService.openDialogsForm(
        'Add Report',
        [
          { name: 'startDate', placeholder: 'Start Date', type: 'date', required: true },
          { name: 'endDate', placeholder: 'End Date', type: 'date', required: true },
          { name: 'description', placeholder: 'Summary', type: 'markdown', required: true },
          { name: 'beginningBalance', placeholder: 'Beginning Balance', type: 'textbox', inputType: 'number', required: true },
          { name: 'sales', placeholder: 'Sales', type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'otherIncome', placeholder: 'Other Income', type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'wages', placeholder: 'Personnel', type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'otherExpenses', placeholder: 'Non-Personnel', type: 'textbox', inputType: 'number', required: true, min: 0 }
        ],
        this.addFormInitialValues(oldReport, { startDate: lastMonthStart, endDate: lastMonthEnd }),
        {
          disableIfInvalid: true,
          onSubmit: (newReport) => this.updateReport(oldReport, newReport).subscribe(() => {
            this.dialogsFormService.closeDialogsForm();
          })
        }
      );
    });
  }

  openDeleteReportDialog(report) {
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'delete',
        type: 'report',
        displayDates: report,
        okClick: {
          request: this.updateReport(report),
          onNext: () => {
            deleteDialog.close();
          }
        },
        isDateUtc: true
      }
    });
  }

  addFormInitialValues(oldReport, { startDate, endDate }) {
    const initialValues = {
      description: '',
      beginningBalance: 0,
      sales: 0,
      otherIncome: 0,
      wages: 0,
      otherExpenses: 0,
      ...oldReport,
      startDate: new Date(convertUtcDate(oldReport.startDate) || startDate),
      endDate: new Date(convertUtcDate(oldReport.endDate) || endDate)
    };
    const formControl = (initialValue, fieldName: string) => [
      initialValue,
      [ CustomValidators.required, this.addFormValidator(fieldName) ]
    ];
    return Object.entries(initialValues).reduce(
      (formObj, [ key, value ]) => ({ ...formObj, [key]: formControl(value, key) }), {}
    );
  }

  addFormValidator(fieldName) {
    return fieldName === 'endDate' ?
      CustomValidators.endDateValidator() :
      [ 'sales', 'otherIncome', 'wages', 'otherExpenses' ].indexOf(fieldName) > -1 ?
      Validators.min(0) :
      () => {};
  }

  updateReport(oldReport, newReport: any = {}) {
    const dateFields = [ 'startDate', 'endDate' ];
    const numberFields = [ 'beginningBalance', 'sales', 'otherIncome', 'wages', 'otherExpenses' ];
    const transformFields = (key: string, value: Date | string) => dateFields.indexOf(key) > -1 ?
      (<Date>value).getTime() :
      numberFields.indexOf(key) > -1 ?
      +value :
      value;
    const { _id, _rev, ...newDoc } = <any>Object.entries(newReport).reduce(
      (obj, [ key, value ]: [ string, Date | string ]) => ({ ...obj, [key]: transformFields(key, value) }),
      {}
    );
    const docs = [ { ...oldReport, status: 'archived' }, newDoc ].filter(doc => doc.startDate !== undefined);
    return this.teamsService.updateAdditionalDocs(docs, this.team, 'report', { utcKeys: dateFields }).pipe(tap(() => {
      this.reportsChanged.emit();
      this.dialogsLoadingService.stop();
    }));
  }

  addComment(report) {
    let message = '';
    this.report = report;
    const comments = this.filterCommentsFromNews(report);

    this.dialogsFormService.openDialogsForm(
      'Add Comment',
      [ { name: 'message', placeholder: 'Comment', type: 'markdown', required: true, imageGroup: { teams: this.report.teamId} } ],
      { message: [ message, CustomValidators.requiredMarkdown ] },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) },
      comments
    );

    // viewing comments
    this.viewComments(comments)
  }

  viewComments(comments) {
    console.log(comments);
    // separating the comments from replies
    console.log(comments.filter(comment => comment.doc.replyTo == undefined))
  }

  filterCommentsFromNews (report) {
    return this.news.filter(item => item.doc.reportId === report._id)
  }

  postMessage(message) {
    this.newsService.postNews({
      viewIn: [ { '_id': this.team._id, section: 'teams', public: this.team.userStatus !== 'member' } ],
      reportId: this.report._id,
      teamId: this.team._id,
      messageType: this.team.teamType,
      viewedBy: [this.currentUser._id],
      messagePlanetCode: this.team.teamPlanetCode,
      ...message
    }, 'Comment has been posted successfully', 'report-notes').pipe(
      // switchMap(() => this.sendNotifications('message')),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => { this.dialogsFormService.closeDialogsForm(); });
  }

  // sendNotifications(type, { members, newMembersLength = 0 }: { members?, newMembersLength? } = {}) {
  //   return this.teamsService.sendNotifications(type, members || this.members, {
  //     newMembersLength, url: this.router.url, team: { ...this.team }
  //   });


  openReportDialog(report) {
    this.dialog.open(TeamsReportsDialogComponent, {
      data: { report, team: this.team },
      width: '70ch'
    });
  }

  exportReports() {
    const exportData = this.reports.map(report => ({
      'Start Date': report.startDate,
      'End Date': report.endDate,
      'Created Date': report.createdDate,
      'Updated Date': report.updatedDate,
      'Beginning Balance': report.beginningBalance,
      'Sales': report.sales,
      'Other Income': report.otherIncome,
      'Wages': report.wages,
      'Other Expenses': report.otherExpenses,
      'Profit/Loss': report.sales + report.otherIncome - report.wages - report.otherExpenses,
      'Ending Balance': report.beginningBalance + report.sales + report.otherIncome - report.wages - report.otherExpenses
    }));
    this.csvService.exportCSV({ data: exportData, title: `${this.team.name} Financial Report Summary` });
  }

}
