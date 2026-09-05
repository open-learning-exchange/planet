import { Component, Inject, LOCALE_ID, OnInit, OnDestroy, ViewEncapsulation, HostBinding, ViewChild } from '@angular/core';
import { formatDate as formatLocaleDate } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Location, NgTemplateOutlet, NgClass } from '@angular/common';
import { combineLatest, Subject, of } from 'rxjs';
import { takeUntil, take, finalize } from 'rxjs/operators';
import type { Chart as ChartJs, ChartConfiguration } from 'chart.js';
import { loadChart } from '../../shared/chart-utils';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { styleVariables, formatDate } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { CsvPreviewSession, CsvService } from '../../shared/csv.service';
import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import {
  attachNamesToPlanets, filterByDate, setMonths, activityParams, codeToPlanetName, reportsDetailParams,
  xyChartData, datasetObject, fullLabel, titleOfChartName, monthDataLabels, filterByMember,
  weekDataLabels, lastThursday, thursdayWeekRangeFromEnd, startOfDay
} from './reports.utils';
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';
import { ReportsDetailData, ReportDetailFilter } from './reports-detail-data';
import { ACTIVITY_DATE_FIELDS, DATE_SORT_FIELDS, dateFieldForReport } from './reports.constants';
import {
  ReportExportAction, ReportExportOption, ReportExportValue, ReportsExportDialogComponent
} from './reports-export-dialog.component';
import { UsersService } from '../../users/users.service';
import { CoursesViewDetailDialogComponent } from '../../courses/view-courses/courses-view-detail.component';
import { ReportsHealthComponent } from './reports-health.component';
import { UsersProfileDialogService } from '../../users/users-profile/users-profile-dialog.service';
import { findDocuments } from '../../shared/mangoQueries';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption, MatOptgroup } from '@angular/material/autocomplete';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow
} from '@angular/material/table';
import { ReportsDetailActivitiesComponent } from './reports-detail-activities.component';

interface DateFilterForm {
  startDate: FormControl<Date>;
  endDate: FormControl<Date>;
};

type ReportExportCategory = 'logins' | 'resources' | 'courses' | 'health' | 'chat' | 'summary';

interface ReportExportData {
  data: any[];
  title: string;
}

const exportDialogTitles: Record<ReportExportCategory, string> = {
  logins: $localize`Export Login Report`,
  resources: $localize`Export Resources Report`,
  courses: $localize`Export Courses Report`,
  health: $localize`Export Health Report`,
  chat: $localize`Export Chat Report`,
  summary: $localize`Export Summary Report`
};

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: ['reports-detail.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatToolbar,
    MatToolbarRow,
    NgTemplateOutlet,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatOptgroup,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatButton,
    FormsModule,
    ReactiveFormsModule,
    MatInput,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatError,
    MatTooltip,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatTabGroup,
    MatTab,
    MatGridList,
    MatGridTile,
    PlanetLoadingSpinnerComponent,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    NgClass,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    ReportsDetailActivitiesComponent,
    ReportsHealthComponent
  ]
})
export class ReportsDetailComponent implements OnInit, OnDestroy {

  @HostBinding('class') readonly hostClass = 'manager-reports-detail';
  @ViewChild(ReportsHealthComponent) healthComponent: ReportsHealthComponent;
  parentCode = '';
  planetCode = '';
  planetName = '';
  reports: any = {};
  charts: ChartJs[] = [];
  users: any[] = [];
  onDestroy$ = new Subject<void>();
  filter: ReportDetailFilter = { app: '', members: [], startDate: new Date(0), endDate: new Date() };
  codeParam = '';
  loginActivities = new ReportsDetailData(ACTIVITY_DATE_FIELDS.login);
  resourceActivities = { byDoc: [], total: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity) };
  courseActivities = { byDoc: [], total: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity) };
  progress = {
    enrollments: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity),
    completions: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity),
    steps: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity)
  };
  chatActivities = new ReportsDetailData(ACTIVITY_DATE_FIELDS.chat);
  voicesActivities = new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity);
  today: Date;
  minDate: Date;
  ratings = { total: new ReportsDetailData(ACTIVITY_DATE_FIELDS.activity), resources: [], courses: [] };
  dateFilterForm: FormGroup<DateFilterForm>;
  teams: any;
  selectedTeam: any = 'All';
  showFiltersRow = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  dateQueryParams = {
    startDate: null,
    endDate: null
  };
  selectedTimeFilter = '12m';
  showCustomDateFields = false;
  resourcesLoading = true;
  coursesLoading = true;
  chatLoading = true;
  loginLoading = true;
  progressLoading = true;
  healthLoading = true;
  voicesLoading = true;
  healthNoData = false;
  timeFilterOptions = this.activityService.standardTimeFilters;
  comparisonWeek1End: Date = new Date();
  comparisonWeek2End: Date = new Date();
  comparisonLoading = false;
  comparisonTableData: any[] = [];
  comparisonColumns = ['metric', 'week1', 'week2', 'change'];
  week1Label = $localize`Week 1`;
  week2Label = $localize`Week 2`;
  comparisonData1: any = {};
  comparisonData2: any = {};

  get summaryLoading() {
    return this.loginLoading || this.resourcesLoading ||
     this.coursesLoading || this.chatLoading || this.voicesLoading || this.progressLoading;
  }

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private dialogsLoadingService: DialogsLoadingService,
    private csvService: CsvService,
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private usersProfileDialogService: UsersProfileDialogService,
    private fb: NonNullableFormBuilder,
    private deviceInfoService: DeviceInfoService,
    private planetMessageService: PlanetMessageService,
    @Inject(LOCALE_ID) private localeId: string
  ) {
    this.initDateFilterForm();
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    const dbName = 'communityregistrationrequests';
    this.dialogsLoadingService.start();
    this.couchService.currentTime().subscribe((currentTime: number) => {
      this.today = new Date(new Date(currentTime).setHours(0, 0, 0));
      this.initializeComparisonDates();
      combineLatest(this.route.paramMap, this.route.queryParams, this.stateService.couchStateListener(dbName))
        .pipe(takeUntil(this.onDestroy$))
        .subscribe(([ params, queryParams, planetState ]: [ ParamMap, ParamMap, any ]) => {
          if (planetState === undefined) {
            return;
          }
          const planets = attachNamesToPlanets((planetState && planetState.newData) || []);
          const parseDate = (dateStr) => {
            if (!dateStr) {
              return null;
            }
            const [ y, m, d ] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
          };
          this.dateQueryParams = {
            startDate: parseDate(queryParams['startDate']),
            endDate: parseDate(queryParams['endDate']) || this.today
          };
          if (
            this.dateQueryParams.startDate instanceof Date && !isNaN(this.dateQueryParams.startDate.getTime()) &&
          this.dateQueryParams.endDate instanceof Date && !isNaN(this.dateQueryParams.endDate.getTime())
          ) {
            this.selectedTimeFilter = 'custom';
            this.showCustomDateFields = true;
          }
          this.dateFilterForm.controls.endDate.setValue(
            this.dateQueryParams.endDate instanceof Date && !isNaN(this.dateQueryParams.endDate.getTime())
              ? this.dateQueryParams.endDate : this.today
          );
          this.codeParam = params.get('code');
          this.planetCode = this.codeParam || this.stateService.configuration.code;
          this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
          this.planetName = codeToPlanetName(this.codeParam, this.stateService.configuration, planets);
          this.initializeData(!this.codeParam);
        });
    });

    this.stateService.requestData(dbName, 'local');
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }

  onFilterChange(filterValue: '' | 'planet' | 'myplanet') {
    this.filter.app = filterValue;
    this.filterData();
  }

  setFilterDate(date: Date, field: 'startDate' | 'endDate') {
    this.filter[field] = date;
    this.loginActivities.filter(this.filter);
  }

  initializeData(local: boolean) {
    // getTotalUsers sets users stored in ReportsService which is necessary for some calculations
    this.activityService.getTotalUsers(this.planetCode, local).subscribe(() => {
      this.getLoginActivities();
      this.getRatingInfo();
      this.getDocVisits('resourceActivities');
      this.getDocVisits('courseActivities');
      this.getPlanetCounts(local);
      this.getTeams();
      this.getChatUsage();
      this.getVoicesUsage();
      this.dialogsLoadingService.stop();
    });
  }

  setUserCounts({ count, byGender }) {
    this.reports.totalUsers = count;
    this.reports.usersByGender = byGender;
  }

  initDateFilterForm() {
    this.dateFilterForm = this.fb.group({
      startDate: this.fb.control(new Date(0), { validators: Validators.required }),
      endDate: this.fb.control(new Date(), { validators: Validators.required })
    }, { validators: CustomValidators.endDateValidator() });
    this.dateFilterForm.valueChanges.subscribe(value => {
      const { startDate = this.filter.startDate, endDate = this.filter.endDate } = value;

      this.filter = { ...this.filter, startDate, endDate };

      if (startDate && endDate && this.minDate && this.today) {
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        const urlTree = this.router.createUrlTree([], {
          queryParams: {
            startDate: formattedStartDate,
            endDate: formattedEndDate
          },
          queryParamsHandling: 'merge'
        });
        this.location.replaceState(urlTree.toString());
      }
      this.filterData();
    });
  }

  filterData() {
    if (this.dateFilterForm?.invalid) {
      return;
    }
    this.loginActivities.filter(this.filter);
    this.setLoginActivities();
    this.ratings.total.filter(this.filter);
    this.setRatingInfo();
    this.resourceActivities.total.filter(this.filter);
    this.setDocVisits('resourceActivities');
    this.courseActivities.total.filter(this.filter);
    this.setDocVisits('courseActivities');
    this.progress.enrollments.filter(this.filter);
    this.progress.completions.filter(this.filter);
    this.progress.steps.filter(this.filter);
    this.setStepCompletion();
    this.setUserCounts(this.activityService.groupUsers(
      this.users.filter(
        user => this.filter.members.length === 0 || this.filter.members.some(
          member => member.userId === user._id && member.userPlanetCode === user.doc.planetCode
        )
      )
    ));
    this.chatActivities.filter(this.filter);
    this.setChatUsage();
    this.voicesActivities.filter(this.filter);
    this.setVoicesUsage();
  }

  getLoginActivities() {
    combineLatest([
      this.usersService.usersListener(true),
      this.activityService.getAllActivities('login_activities', activityParams(this.planetCode))
    ]).pipe(
      take(1),
      finalize(() => this.loginLoading = false)
    ).subscribe(([ users, loginActivities ]: [ any[], any ]) => {
      this.loginActivities.data = loginActivities;
      const adminName = this.stateService.configuration.adminName.split('@')[0];
      this.users = users.filter(user => user.doc.name !== adminName && user.doc.planetCode === this.planetCode);
      this.minDate = new Date(
        new Date(this.activityService.minTime(this.loginActivities.data, ACTIVITY_DATE_FIELDS.login)).setHours(0, 0, 0, 0)
      );
      this.dateFilterForm.controls.startDate.setValue(
        this.dateQueryParams.startDate instanceof Date && !isNaN(this.dateQueryParams.startDate.getTime())
          ? this.dateQueryParams.startDate : new Date(new Date().setMonth(new Date().getMonth() - 12))
      );
      this.setLoginActivities();
    });
    this.usersService.requestUserData();
  }

  setStepCompletion() {
    const { byMonth } = this.activityService.groupStepCompletion(this.progress.steps.filteredData);
    this.reports.totalStepCompleted = byMonth.reduce((total, doc: any) => total + doc.count, 0);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'stepCompletedChart' });
  }

  setLoginActivities() {
    const { byUser, byMonth } = this.activityService.groupLoginActivities(this.loginActivities.filteredData);
    this.reports.totalMemberVisits = byUser.reduce((total, resource: any) => total + resource.count, 0);
    const byUserWithProfile = byUser.map((activity) => ({
      ...activity,
      userDoc: this.users.find((user) => user.doc.name === activity.user && user.doc.planetCode === this.planetCode)
    }));
    this.reports.visits = byUserWithProfile.slice(0, 5);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'visitChart' });
    this.setChart({ ...this.setGenderDatasets(byMonth, true), chartName: 'uniqueVisitChart' });
  }

  getRatingInfo() {
    this.activityService.getRatingInfo(activityParams(this.planetCode)).subscribe((ratings: any[]) => {
      this.ratings.total.data = ratings;
      this.setRatingInfo();
    });
  }

  setRatingInfo() {
    const averageRatings = this.activityService.groupRatings(this.ratings.total.filteredData);
    this.ratings.resources = averageRatings.filter(item => item.type === 'resource');
    this.ratings.courses = averageRatings.filter(item => item.type === 'course');
    this.reports.resourceRatings = this.ratings.resources.slice(0, 5);
    this.reports.courseRatings = this.ratings.courses.slice(0, 5);
  }

  getCourseProgress() {
    combineLatest([
      this.activityService.courseProgressReport(),
      this.couchService.findAll('courses')
    ]).pipe(finalize(() => this.progressLoading = false)).subscribe(([ { enrollments, completions, steps }, courses ]: [ any, any[] ]) => {
      this.progress.enrollments.data = enrollments;
      this.progress.completions.data = completions;
      this.progress.steps.data = steps.map(({ userId, ...step }) => ({ ...step, user: userId.replace('org.couchdb.user:', '') }));
      this.courseActivities.total.data = this.courseActivities.total.data.map(courseActivity => {
        const course: any = courses.find(c => c._id === courseActivity.courseId) || { steps: [] };
        return {
          ...courseActivity,
          steps: course.steps?.length || 0,
          exams: course.steps?.filter(step => step.exam)?.length || 0
        };
      });
      this.setStepCompletion();
      this.setDocVisits('courseActivities', false);
    });
  }

  getDocVisits(type) {
    const params = reportsDetailParams(type);
    this.activityService.getAllActivities(params.db, activityParams(this.planetCode)).pipe(
      finalize(() => {
        if (type === 'resourceActivities') {
          this.resourcesLoading = false;
        } else if (type === 'courseActivities') {
          this.coursesLoading = false;
        }
      })
    ).subscribe((activities: any) => {
      // Filter out bad data caused by error found Mar 2 2020 where course id was sometimes undefined in database
      // Also filter out bad data found Mar 29 2020 where resourceId included '_design'
      this[type].total.data = activities.filter(
        activity => (activity.resourceId || activity.courseId) && (activity.resourceId || activity.courseId).indexOf('_design') === -1
          && !activity.private
      );
      this.setDocVisits(type, true);
    });
  }

  setDocVisits(type, isInit = false) {
    const params = reportsDetailParams(type);
    const { byDoc, byMonth } = this.activityService.groupDocVisits(this[type].total.filteredData, type.replace('Activities', 'Id'));
    this[type].byDoc = byDoc;
    this.reports[params.views] = byDoc.reduce((total, doc: any) => total + doc.count, 0);
    this.reports[params.record] = byDoc.sort((a, b) => b.count - a.count).slice(0, 5);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: params.chartName });
    if (isInit && type === 'courseActivities') {
      this.getCourseProgress();
    }
  }

  getPlanetCounts(local: boolean) {
    if (local) {
      this.activityService.getDatabaseCount('resources').subscribe(count => this.reports.totalResources = count);
      this.activityService.getDatabaseCount('courses').subscribe(count => this.reports.totalCourses = count);
    } else {
      this.activityService.getChildDatabaseCounts(this.planetCode).subscribe((response: any) => {
        this.reports.totalResources = response.totalResources;
        this.reports.totalCourses = response.totalCourses;
      });
    }
  }

  getTeams() {
    this.couchService.findAll('teams', { selector: { status: 'active' } }).subscribe((teams: any[]) => {
      this.teams = teams
        .filter(team => team.teamPlanetCode === this.planetCode && team.name)
        .sort((teamA, teamB) => teamA.name.localeCompare(teamB.name, 'en', { sensitivity: 'base' }))
        .reduce((teamObj: any, team) => ({
          ...teamObj,
          [team.type || 'team']: [ ...teamObj[team.type || 'team'], team ]
        }), { enterprise: [], team: [] });
    });
  }

  getChatUsage() {
    this.activityService.getChatHistory().pipe(finalize(() => this.chatLoading = false)).subscribe((data) => {
      this.chatActivities.data = data;
      this.chatActivities.filter(this.filter);
      this.setChatUsage();
    });
  }

  setChatUsage() {
    const { byMonth } = this.activityService.groupChatUsage(this.chatActivities.filteredData);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'chatUsageChart' });
  }

  getVoicesUsage() {
    this.activityService.getVoicesCreated().pipe(finalize(() => this.voicesLoading = false)).subscribe((data) => {
      this.voicesActivities.data = data.map(item => ({
        ...item,
        user: item.user?.name || '',
      }));
      this.voicesActivities.filter(this.filter);
      this.setVoicesUsage();
    });
  }

  setVoicesUsage() {
    const { byMonth } = this.activityService.groupVoicesCreated(this.voicesActivities.filteredData);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'voicesCreatedChart' });
  }

  getTeamMembers(team: any) {
    if (team === 'All') {
      return of([]);
    }
    return this.couchService.findAll('teams', findDocuments({ teamId: team._id, docType: 'membership' }));
  }

  onTeamsFilterChange(filterValue) {
    const filterMembers = (members: any[]) => {
      this.filter.members = members;
      this.filterData();
    };
    this.selectedTeam = filterValue;
    if (filterValue === 'All') {
      filterMembers([]);
      return;
    }
    this.getTeamMembers(filterValue).subscribe((members: any) => {
      filterMembers(members);
    });
  }

  setGenderDatasets(data, unique = false) {
    const months = setMonths({
      startDate: this.filter.startDate,
      endDate: this.filter.endDate
    });
    const labels = months.map(month => monthDataLabels(month, this.localeId));

    const genderFilter = (gender: string) =>
      months.map((month) => data.find((datum: any) => datum.gender === gender && datum.date === month) || { date: month, unique: [] });
    const monthlyObj = (month) => {
      const monthlyData = data.filter((datum: any) => datum.date === month);
      return ({
        count: monthlyData.reduce((count: number, datum: any) => count + datum.count, 0),
        unique: monthlyData.reduce((allUnique: string[], datum: any) => allUnique.concat(datum.unique), [])
      });
    };
    const totals = () => months.map((month) => ({ date: month, ...monthlyObj(month) }));
    return ({
      data: {
        datasets: [
          datasetObject($localize`Male`, xyChartData(genderFilter('male'), unique), styleVariables.primaryLighter),
          datasetObject($localize`Female`, xyChartData(genderFilter('female'), unique), styleVariables.accentLighter),
          datasetObject($localize`Did not specify`, xyChartData(genderFilter(undefined), unique), styleVariables.grey),
          datasetObject($localize`Total`, xyChartData(totals(), unique), styleVariables.primary)
        ]
      },
      labels
    });
  }

  async setChart({ data, labels, chartName }) {
    const { Chart } = await loadChart([
      'BarController', 'DoughnutController', 'CategoryScale', 'LinearScale', 'BarElement', 'Title', 'Legend', 'Tooltip'
    ]);
    const updateChart = this.charts.find(newChart => newChart.canvas.id === chartName);
    if (updateChart) {
      updateChart.data = { ...data, labels };
      updateChart.update('none');
      return;
    }
    const chartConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: { ...data, labels },
      options: {
        plugins: {
          title: { display: true, text: titleOfChartName(chartName), font: { size: 16 } },
          legend: { position: 'bottom' }
        },
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { type: 'category' },
          y: {
            type: 'linear',
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    };
    this.charts.push(new Chart(chartName, chartConfig));
  }

  openExportDialog(category: ReportExportCategory) {
    const reports = this.exportReportOptions(category);
    if (!reports.length) {
      return;
    }
    const minDate = new Date(this.activityService.minTime(this.loginActivities.data, ACTIVITY_DATE_FIELDS.login)).setHours(0, 0, 0, 0);
    const teamOptions = [
      { name: $localize`All Members`, value: 'All' },
      ...this.teams.team.map(t => ({ name: t.name, value: t })),
      ...this.teams.enterprise.map(t => ({ name: t.name, value: t }))
    ];
    this.dialog.open(ReportsExportDialogComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        title: exportDialogTitles[category],
        reports,
        teamOptions,
        team: this.selectedTeam,
        startDate: this.dateFilterForm.controls.startDate.value,
        endDate: this.dateFilterForm.controls.endDate.value,
        minDate: new Date(minDate),
        maxDate: new Date(this.today),
        onSubmit: (value: ReportExportValue, action: ReportExportAction) => this.runExport(value, action)
      }
    });
  }

  // The resource and course reports each cover more than one report, and only offer the ones with data
  private exportReportOptions(category: ReportExportCategory): ReportExportOption[] {
    switch (category) {
      case 'resources':
        return [
          ...(this.resourceActivities.total ? [ { name: $localize`Resource Views`, value: 'resourceViews' } ] : []),
          { name: $localize`Resources Overview`, value: 'resourcesOverview' }
        ];
      case 'courses':
        return [
          ...(this.courseActivities.total ? [ { name: $localize`:@@course-views-single:Course Views`, value: 'courseViews' } ] : []),
          ...(this.progress?.steps ? [ { name: $localize`Courses Progress`, value: 'stepCompletions' } ] : []),
          { name: $localize`Courses Overview`, value: 'coursesOverview' }
        ];
      case 'logins':
        return [ { name: $localize`Member Visits`, value: 'logins' } ];
      case 'health':
        return [ { name: $localize`Community Health`, value: 'health' } ];
      case 'chat':
        return [ { name: $localize`Chat Usage`, value: 'chat' } ];
      case 'summary':
        return [ { name: $localize`Summary`, value: 'summary' } ];
    }
  }

  private runExport(value: ReportExportValue, action: ReportExportAction) {
    const preview = action === 'preview' ? this.csvService.openPreviewWindow() : null;
    if (preview && !preview.isOpen) {
      return;
    }
    this.dialogsLoadingService.start();
    this.getTeamMembers(value.team).pipe(
      take(1),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(members => this.deliverReport(value, members, preview));
  }

  private deliverReport(value: ReportExportValue, members: any[], preview: CsvPreviewSession | null) {
    const dateRange = { startDate: value.startDate, endDate: value.endDate };
    if (value.report === 'summary') {
      this.deliverSummary(dateRange, members, value.sortBy, preview);
      return;
    }
    const { data, title } = this.reportExportData(value.report, dateRange, members, value.sortBy);
    if (preview) {
      preview.publish(this.csvService.formatExportRows(data), title);
    } else {
      this.csvService.exportCSV({ data, title });
    }
  }

  private reportExportData(
    reportType: string, dateRange: { startDate: Date, endDate: Date }, members: any[], sortBy: string
  ): ReportExportData {
    switch (reportType) {
      case 'logins':
        return { data: this.loginData(dateRange, members, sortBy), title: $localize`Member Visits` };
      case 'chat':
        return this.chatExportData(dateRange, members, sortBy);
      case 'coursesOverview':
        return this.courseOverviewData(dateRange, members);
      case 'resourcesOverview':
        return this.resourceOverviewData(dateRange, members);
      default:
        return this.docViewData(reportType, dateRange, members, sortBy);
    }
  }

  private loginData(dateRange: { startDate: Date, endDate: Date }, members: any[], sortBy: string) {
    const data = this.loginActivities.inRange(dateRange, members)
      .map(activity => ({
        ...activity,
        androidId: activity.androidId || '',
        deviceName: activity.deviceName || '',
        customDeviceName: activity.customDeviceName || ''
      }));
    return sortBy ? this.sortData(data, sortBy) : data;
  }

  private courseOverviewData(dateRange: { startDate: Date, endDate: Date }, members: any[]): ReportExportData {
    const filteredCourseData = this.courseActivities.total.inRange(dateRange, members) as any[];
    const courseStats = filteredCourseData.reduce((stats: { [courseId: string]: any }, activity: any) => {
      if (!stats[activity.courseId]) {
        stats[activity.courseId] = {
          title: activity.courseTitle || activity.title || activity.max?.title || '',
          steps: activity.steps || 0,
          exams: activity.exams || 0,
          enrollments: 0,
          count: 0,
          stepsCompleted: 0,
          completions: 0,
        };
      }
      stats[activity.courseId].count++;
      return stats;
    }, {});

    const filteredEnrollments = this.progress.enrollments.inRange(dateRange, members) as any[];
    const filteredCompletions = this.progress.completions.inRange(dateRange, members) as any[];
    const filteredSteps = this.progress.steps.inRange(dateRange, members) as any[];

    filteredEnrollments.forEach((enrollment: any) => {
      if (courseStats[enrollment.courseId]) {
        courseStats[enrollment.courseId].enrollments++;
      }
    });
    filteredCompletions.forEach((completion: any) => {
      if (courseStats[completion.courseId]) {
        courseStats[completion.courseId].completions++;
      }
    });
    filteredSteps.forEach((step: any) => {
      if (courseStats[step.courseId]) {
        courseStats[step.courseId].stepsCompleted++;
      }
    });
    Object.keys(courseStats).forEach(courseId => {
      const foundRating = (this.ratings.courses || []).find((rating: any) => rating.item === courseId);
      courseStats[courseId].averageRating = foundRating ? foundRating.value : '';
    });
    const planetForLink = (this.stateService.configuration.planetName ||
                            this.planetName ||
                            'default').toLowerCase();
    const baseUrl = `https://planet.${planetForLink}.ole.org/courses/view/`;
    const csvData = Object.entries(courseStats).map(([ courseId, course ]: [string, any]) => ({
      [$localize`Title`]: course.title,
      [$localize`Link`]: baseUrl + courseId,
      [$localize`Steps`]: course.steps,
      [$localize`Exams`]: course.exams,
      [$localize`Enrollments`]: course.enrollments,
      [$localize`Views`]: course.count,
      [$localize`Steps Completed`]: course.stepsCompleted,
      [$localize`Completions`]: course.completions,
      [$localize`Average Rating`]: course.averageRating
    }));

    return { data: csvData, title: $localize`Courses Overview` };
  }

  private resourceOverviewData(dateRange: { startDate: Date, endDate: Date }, members: any[]): ReportExportData {
    const filteredResourceData = this.resourceActivities.total.inRange(dateRange, members) as any[];
    const resourceStats = filteredResourceData.reduce((stats: { [resourceId: string]: any }, activity: any) => {
      if (activity.resourceId && !stats[activity.resourceId]) {
        stats[activity.resourceId] = {
          title: activity.resourceTitle || activity.title || activity.max?.title || '',
          count: 0
        };
      }
      if (activity.resourceId) {
        stats[activity.resourceId].count++;
      }
      return stats;
    }, {});
    Object.keys(resourceStats).forEach(resourceId => {
      const foundRating = (this.ratings.resources || []).find((rating: any) => rating.item === resourceId);
      resourceStats[resourceId].averageRating = foundRating ? foundRating.value : '';
    });
    const planetForLink = (this.stateService.configuration.planetName ||
                          this.planetName ||
                          'default').toLowerCase();
    const baseUrl = `https://planet.${planetForLink}.ole.org/resources/view/`;
    const csvData = Object.entries(resourceStats).map(([ resourceId, resource ]: [string, any]) => ({
      [$localize`Title`]: resource.title,
      [$localize`Link`]: baseUrl + resourceId,
      [$localize`Views`]: resource.count,
      [$localize`Average Rating`]: resource.averageRating
    }));
    return { data: csvData, title: $localize`Resources Overview` };
  }

  sortData(data: any[], sortBy: string): any[] {
    const order = sortBy.endsWith('Asc') ? 1 : -1;
    let field = sortBy.replace(/Asc|Desc/, '');
    if (field === 'username') {
      field = 'user';
    }
    return data.sort((a, b) => {
      let comparison = 0;
      if ((DATE_SORT_FIELDS as string[]).includes(field)) {
        const dateA = new Date(a[field]).getTime();
        const dateB = new Date(b[field]).getTime();
        comparison = dateA - dateB;
      } else {
        comparison = a[field].localeCompare(b[field]);
      }
      return comparison * order;
    });
  }

  private chatExportData(dateRange: any, members: any[], sortBy: string): ReportExportData {
    let data = this.chatActivities.inRange(dateRange, members);
    if (sortBy) {
      data = this.sortData(data, sortBy);
    }
    const exportData = data.map(activity => ({
      [$localize`User`]: activity.user || '',
      [$localize`AI Provider`]: activity.aiProvider || '',
      [$localize`Timestamp`]: formatLocaleDate(activity.createdDate, 'medium', this.localeId),
      [$localize`Chat Responses`]: activity.conversations?.length || 0,
      [$localize`Assistant`]: activity.assistant ? $localize`Yes` : $localize`No`,
      [$localize`Shared`]: activity.shared ? $localize`Yes` : $localize`No`,
      [$localize`Has Attachments`]: activity.context?.resource?.attachments?.length > 0 ? $localize`Yes` : $localize`No`
    }));
    return { data: exportData, title: $localize`Chat Usage` };
  }

  private deliverSummary(dateRange: any, members: any[], sortBy: string, preview: CsvPreviewSession | null) {
    const loginData = this.loginActivities.inRange(dateRange, members);
    const resourceData = this.resourceActivities.total.inRange(dateRange, members);
    const courseData = this.courseActivities.total.inRange(dateRange, members);
    const progressData = this.progress.steps.inRange(dateRange, members);
    const chatData = this.chatActivities.inRange(dateRange, members);
    const voicesData = this.voicesActivities.inRange(dateRange, members);

    if (sortBy) {
      const order = sortBy.endsWith('Asc') ? 1 : -1;
      const sortFunction = (a, b) => {
        const aDate = new Date(a.time || a.loginTime);
        const bDate = new Date(b.time || b.loginTime);
        const comparison =
          (aDate.getFullYear() - bDate.getFullYear()) ||
          (aDate.getMonth() - bDate.getMonth());
        return comparison * order;
      };
      loginData.sort(sortFunction);
      resourceData.sort(sortFunction);
      courseData.sort(sortFunction);
      progressData.sort(sortFunction);
      chatData.sort(sortFunction);
      voicesData.sort(sortFunction);
    }

    if (preview) {
      preview.publish(
        this.csvService.summaryRows(loginData, resourceData, courseData, progressData, chatData, voicesData),
        $localize`Summary report for ${this.planetName}`
      );
      return;
    }
    this.csvService.exportSummaryCSV(
      loginData,
      resourceData,
      courseData,
      progressData,
      chatData,
      voicesData,
      this.planetName,
      dateRange.startDate,
      dateRange.endDate
    );
  }

  openCourseView(courseId) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId },
      minWidth: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }

  private docViewData(reportType: string, dateRange: any, members: any[], sortBy: string): ReportExportData {
    let data = {
      resourceViews: this.resourceActivities.total.data,
      courseViews: this.courseActivities.total.data,
      stepCompletions: this.progress.steps.data,
      health: this.healthComponent && this.healthComponent.examinations
    }[reportType];
    const title = {
      resourceViews: $localize`Resource Views`,
      courseViews: $localize`:@@course-views-single:Course Views`,
      health: $localize`Community Health`,
      stepCompletions: $localize`Courses Progress` }[reportType];
    if (sortBy) {
      data = this.sortData(data, sortBy);
    }
    return {
      data: this.activityService.appendAge(
        filterByMember(filterByDate(data, dateFieldForReport(reportType), dateRange), members), this.today)
        .map(activity => {
          const baseActivity = {
            ...activity,
            androidId: activity.androidId || '',
            deviceName: activity.deviceName || ''
          };
          if (reportType === 'health' && activity.updatedDate) {
            baseActivity.updatedDate = fullLabel(activity.updatedDate, this.localeId);
          }
          return baseActivity;
        }),
      title
    };
  }

  goBack() {
    const route = this.codeParam === null ? '../../' : '../';
    this.router.navigate([ route ], { relativeTo: this.route });
  }

  openResourceView(resourceId) {
    this.dialog.open(DialogsResourcesViewerComponent, { data: { resourceId }, autoFocus: false });
  }

  openMemberView(user, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
      if ((event as KeyboardEvent).repeat) {
        return;
      }
    }
    if (!user) {
      return;
    }
    this.usersProfileDialogService.open({ member: { name: user.name, userPlanetCode: user.planetCode } });
  }

  resetDateFilter({ startDate, endDate }: { startDate?: Date, endDate?: Date } = {}) {
    const newStartDate = startDate || this.minDate;
    const newEndDate = endDate || this.today;
    this.dateFilterForm.patchValue({
      startDate: newStartDate,
      endDate: newEndDate
    }, { emitEvent: true });
  }

  onTimeFilterChange(timeFilter: string) {
    this.selectedTimeFilter = timeFilter;
    const { startDate, endDate, showCustomDateFields } = this.activityService.getDateRange(timeFilter, this.minDate);
    this.showCustomDateFields = showCustomDateFields;

    if (timeFilter === 'custom') {
      const currentStartDate = new Date();
      currentStartDate.setMonth(currentStartDate.getMonth() - 12);
      const currentEndDate = this.filter.endDate || this.today;
      this.dateFilterForm.patchValue({
        startDate: currentStartDate,
        endDate: currentEndDate
      });
      return;
    }
    this.resetDateFilter({ startDate, endDate });
    this.filter.startDate = startDate;
    this.filter.endDate = endDate;
    this.filterData();
  }

  clearFilters() {
    this.filter.app = '';
    this.selectedTeam = 'All';
    this.filter.members = [];
    this.onTimeFilterChange('12m');
  }

  onHealthLoadingChange(loading: boolean) {
    this.healthLoading = loading;
  }

  onHealthNoDataChange(noData: boolean) {
    this.healthNoData = noData;
  }

  initializeComparisonDates() {
    this.comparisonWeek2End = lastThursday(this.today || new Date());
    const prevThu = new Date(this.comparisonWeek2End);
    prevThu.setDate(prevThu.getDate() - 7);
    this.comparisonWeek1End = prevThu;

    this.onComparisonDateChange();
  }

  onComparisonDateChange() {
    this.comparisonWeek1End = startOfDay(new Date(this.comparisonWeek1End));
    this.comparisonWeek2End = startOfDay(new Date(this.comparisonWeek2End));
    const w1Range = thursdayWeekRangeFromEnd(this.comparisonWeek1End);
    const w2Range = thursdayWeekRangeFromEnd(this.comparisonWeek2End);
    const formatWeekRange = (range) =>
      `${weekDataLabels(range.startDate, this.localeId)} - ${weekDataLabels(range.endDate, this.localeId)}`;
    this.week1Label = $localize`Week 1 (${formatWeekRange(w1Range)})`;
    this.week2Label = $localize`Week 2 (${formatWeekRange(w2Range)})`;
  }

  loadComparisonData() {
    if (!this.comparisonWeek1End || !this.comparisonWeek2End) {
      return;
    };

    this.comparisonLoading = true;
    this.comparisonTableData = [];

    this.comparisonData1 = this.getMetricsForDateRange(thursdayWeekRangeFromEnd(this.comparisonWeek1End));
    this.comparisonData2 = this.getMetricsForDateRange(thursdayWeekRangeFromEnd(this.comparisonWeek2End));

    this.generateComparisonTable();
    this.comparisonLoading = false;
  }

  private getMetricsForDateRange(range: { startDate: Date, endDate: Date }) {
    const loginData = this.loginActivities.filteredInRange(range);
    const loginProcessed = this.activityService.groupLoginActivities(loginData);
    const resourceProcessed = this.activityService.groupDocVisits(
      this.resourceActivities.total.filteredInRange(range),
      'resourceId'
    );
    const courseProcessed = this.activityService.groupDocVisits(
      this.courseActivities.total.filteredInRange(range),
      'courseId'
    );
    const stepProcessed = this.activityService.groupStepCompletion(this.progress.steps.filteredInRange(range));
    const chatProcessed = this.activityService.groupChatUsage(this.chatActivities.filteredInRange(range));
    const voicesProcessed = this.activityService.groupVoicesCreated(this.voicesActivities.filteredInRange(range));

    return {
      totalMemberVisits: loginProcessed.byUser.reduce((t, u) => t + u.count, 0),
      uniqueVisitors: new Set(loginData.map(l => l.user)).size,
      totalResourceViews: resourceProcessed.byDoc.reduce((t, d) => t + d.count, 0),
      totalCourseViews: courseProcessed.byDoc.reduce((t, d) => t + d.count, 0),
      totalStepCompleted: stepProcessed.byMonth.reduce((t, m) => t + m.count, 0),
      totalChatUsage: chatProcessed.byMonth.reduce((t, m) => t + m.count, 0),
      totalVoicesCreated: voicesProcessed.byMonth.reduce((t, m) => t + m.count, 0),
    };
  }

  generateComparisonTable() {
    const metrics = [
      { key: 'uniqueVisitors', label: $localize`Unique Member Visits` },
      { key: 'totalMemberVisits', label: $localize`Total Member Visits` },
      { key: 'totalResourceViews', label: $localize`Resource Views` },
      { key: 'totalCourseViews', label: $localize`Course Views` },
      { key: 'totalStepCompleted', label: $localize`Steps Completed` },
      { key: 'totalChatUsage', label: $localize`Chat Usage` },
      { key: 'totalVoicesCreated', label: $localize`Voices Created` }
    ];

    this.comparisonTableData = metrics.map(metric => {
      const week1Value = this.comparisonData1[metric.key] || 0;
      const week2Value = this.comparisonData2[metric.key] || 0;
      const changeValue = week2Value - week1Value;
      const percentageChange = week1Value > 0 ? Math.round((changeValue / week1Value) * 100 * 10) / 10 : 0;
      const changeText = week1Value === 0 ?
        (changeValue >= 0 ? `+${changeValue}` : `${changeValue}`) :
        (changeValue >= 0 ? `+${changeValue} (+${percentageChange}%)` :
        `${changeValue} (${percentageChange}%)`);

      return {
        metric: metric.label,
        week1: week1Value,
        week2: week2Value,
        change: changeText,
        changeValue
      };
    });
  }

  private getChartAsCanvas(chartId: string): HTMLCanvasElement {
    const chart = this.charts.find(c => c.canvas.id === chartId);
    if (!chart) {
      this.planetMessageService.showMessage($localize`Chart not available. Please wait for the chart to load.`);
      throw new Error(`Chart with id ${chartId} not found`);
    }

    const canvas = chart.canvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    return tempCanvas;
  }

  downloadChart(chartId: string) {
    const canvas = this.getChartAsCanvas(chartId);

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${chartId}-${formatDate(new Date())}.png`;
    link.href = url;
    link.click();
  }

  hasNonZeroChartData(chartId: string): boolean {
    const chart = this.charts.find(c => c.canvas.id === chartId);
    if (!chart) {
      return false;
    }
    const datasets: any[] = (chart.data && (chart.data as any).datasets) || [];
    if (!datasets.length) {
      return false;
    }
    return datasets.some(ds => {
      const dataArr = Array.isArray(ds.data) ? ds.data : [];
      return dataArr.some(v => {
        const val = this.getChartPointValue(v);
        return val !== undefined && val !== 0;
      });
    });
  }

  private getChartPointValue(value: any): number | undefined {
    if (value && typeof value === 'object') {
      const val = value.y ?? value.v;
      return typeof val === 'number' ? val : undefined;
    }
    return typeof value === 'number' ? value : undefined;
  }

  async copyChartToClipboard(chartId: string) {
    const canvas = this.getChartAsCanvas(chartId);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((chartBlob) => resolve(chartBlob), 'image/png');
    });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      this.planetMessageService.showMessage($localize`Chart copied to clipboard`);
    } catch (err) {
      this.planetMessageService.showAlert($localize`Failed to copy chart to clipboard`);
    }
  }

  private comparisonTableExportData(): ReportExportData | null {
    if (this.comparisonTableData.length === 0) {
      this.planetMessageService.showAlert($localize`No comparison data available`);
      return null;
    }
    const week1Header = this.week1Label.replace(/,/g, '');
    const week2Header = this.week2Label.replace(/,/g, '');

    return {
      data: this.comparisonTableData.map(row => ({
        [$localize`Metric`]: row.metric,
        [week1Header]: row.week1,
        [week2Header]: row.week2,
        [$localize`Net Change`]: row.change
      })),
      title: `${this.planetName || $localize`Reports`}_Comparison_${formatDate(new Date())}`
    };
  }

  downloadComparisonTableCSV() {
    const comparisonTable = this.comparisonTableExportData();
    if (!comparisonTable) {
      return;
    }
    this.csvService.exportCSV(comparisonTable);
    this.planetMessageService.showMessage($localize`Comparison table downloaded as CSV`);
  }

  previewComparisonTableCSV() {
    const preview = this.csvService.openPreviewWindow();
    if (!preview.isOpen) {
      return;
    }
    const comparisonTable = this.comparisonTableExportData();
    if (!comparisonTable) {
      preview.cancel();
      return;
    }
    preview.publish(this.csvService.formatExportRows(comparisonTable.data), comparisonTable.title);
  }
}
