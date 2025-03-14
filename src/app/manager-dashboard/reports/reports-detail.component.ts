import { Component, OnInit, OnDestroy, ViewEncapsulation, HostBinding, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import { combineLatest, Subject, of } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { Chart } from 'chart.js';
import { styleVariables } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { CsvService } from '../../shared/csv.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import {
  attachNamesToPlanets, filterByDate, setMonths, activityParams, codeToPlanetName, reportsDetailParams, xyChartData, datasetObject,
  titleOfChartName, monthDataLabels, filterByMember, sortingOptionsMap
} from './reports.utils';
import { MatDialog } from '@angular/material/dialog';
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';
import { ReportsDetailData, ReportDetailFilter } from './reports-detail-data';
import { UsersService } from '../../users/users.service';
import { CoursesViewDetailDialogComponent } from '../../courses/view-courses/courses-view-detail.component';
import { ReportsHealthComponent } from './reports-health.component';
import { UserProfileDialogComponent } from '../../users/users-profile/users-profile-dialog.component';
import { findDocuments } from '../../shared/mangoQueries';

// Define CourseStats interface locally so it can be used throughout this file.
interface CourseStats {
  title: string;
  steps: number;
  exams: number;
  enrollments: number;
  count: number;
  stepsCompleted: number;
  completions: number;
  rating: number;
  ratingCount: number;
}

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: [ 'reports-detail.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ReportsDetailComponent implements OnInit, OnDestroy {

  @HostBinding('class') readonly hostClass = 'manager-reports-detail';
  @ViewChild(ReportsHealthComponent) healthComponent: ReportsHealthComponent;
  parentCode = '';
  planetCode = '';
  planetName = '';
  reports: any = {};
  charts: Chart[] = [];
  users: any[] = [];
  onDestroy$ = new Subject<void>();
  filter: ReportDetailFilter = { app: '', members: [], startDate: new Date(0), endDate: new Date() };
  codeParam = '';
  loginActivities = new ReportsDetailData('loginTime');
  resourceActivities = { byDoc: [], total: new ReportsDetailData('time') };
  courseActivities = { byDoc: [], total: new ReportsDetailData('time') };
  progress = {
    enrollments: new ReportsDetailData('time'),
    completions: new ReportsDetailData('time'),
    steps: new ReportsDetailData('time')
  };
  chatActivities = new ReportsDetailData('createdDate');
  today: Date;
  minDate: Date;
  ratings = { total: new ReportsDetailData('time'), resources: [], courses: [] };
  dateFilterForm: FormGroup;
  disableShowAllTime = true;
  teams: any;
  selectedTeam: any = 'All';

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private csvService: CsvService,
    private dialogsFormService: DialogsFormService,
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.initDateFilterForm();
  }

  ngOnInit() {
    const dbName = 'communityregistrationrequests';
    this.dialogsLoadingService.start();
    combineLatest(this.route.paramMap, this.stateService.couchStateListener(dbName)).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ params, planetState ]: [ ParamMap, any ]) => {
      if (planetState === undefined) {
        return;
      }
      const planets = attachNamesToPlanets((planetState && planetState.newData) || []);
      this.codeParam = params.get('code');
      this.planetCode = this.codeParam || this.stateService.configuration.code;
      this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
      this.planetName = codeToPlanetName(this.codeParam, this.stateService.configuration, planets);
      this.initializeData(!this.codeParam);
    });
    this.stateService.requestData(dbName, 'local');
    this.couchService.currentTime().subscribe((currentTime: number) => {
      this.today = new Date(new Date(currentTime).setHours(0, 0, 0));
      this.dateFilterForm.controls.endDate.setValue(this.today);
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
      this.dialogsLoadingService.stop();
    });
  }

  setUserCounts({ count, byGender }) {
    this.reports.totalUsers = count;
    this.reports.usersByGender = byGender;
  }

  initDateFilterForm() {
    this.dateFilterForm = this.fb.group({
      startDate: [ '' ],
      endDate: [ '' ]
    });
    this.dateFilterForm.valueChanges.subscribe(value => {
      const startDate = value.startDate ? new Date(value.startDate) : null;
      const endDate = value.endDate ? new Date(value.endDate) : null;
      const hasInvalidDates = startDate && endDate && startDate > endDate;

      this.dateFilterForm.setErrors(hasInvalidDates ? { invalidEndDate: true } : null);
      this.filter = { ...this.filter, startDate, endDate };

      if (startDate && endDate && this.minDate && this.today) {
        this.disableShowAllTime = startDate.getTime() === this.minDate.getTime() &&
          endDate.getTime() === this.today.getTime();
      }
      this.filterData();
    });
  }

  filterData() {
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
  }

  getLoginActivities() {
    combineLatest([
      this.usersService.usersListener(true),
      this.activityService.getAllActivities('login_activities', activityParams(this.planetCode))
    ]).pipe(take(1)).subscribe(([ users, loginActivities ]: [ any[], any ]) => {
      this.loginActivities.data = loginActivities;
      const adminName = this.stateService.configuration.adminName.split('@')[0];
      this.users = users.filter(user => user.doc.name !== adminName && user.doc.planetCode === this.planetCode);
      this.minDate = new Date(new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0));
      this.dateFilterForm.controls.startDate.setValue(this.minDate);
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
    this.activityService.courseProgressReport().subscribe(({ enrollments, completions, steps, courses }) => {
      this.progress.enrollments.data = enrollments;
      this.progress.completions.data = completions;
      this.progress.steps.data = steps.map(({ userId, ...step }) => ({ ...step, user: userId.replace('org.couchdb.user:', '') }));
      this.setStepCompletion();
      this.courseActivities.total.data = this.courseActivities.total.data.map(courseActivity => {
        const course = courses.find(c => c._id === courseActivity.courseId) || { steps: 0, exams: 0 };
        return { ...course, ...courseActivity };
      });
    });
  }

  getDocVisits(type) {
    const params = reportsDetailParams(type);
    this.activityService.getAllActivities(params.db, activityParams(this.planetCode))
    .subscribe((activities: any) => {
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
    this.couchService.findAll('teams', { 'selector': { 'status': 'active' } }).subscribe((teams: any[]) => {
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
    this.activityService.getChatHistory().subscribe((data) => {
      this.chatActivities.data = data;
    });
  }

  setChatUsage() {
    const { byMonth } = this.activityService.groupChatUsage(this.chatActivities.filteredData);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'chatUsageChart' });
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
    const months = setMonths();
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
      labels: months.map(month => monthDataLabels(month))
    });
  }

  setChart({ data, labels, chartName }) {
    const updateChart = this.charts.find(chart => chart.canvas.id === chartName);
    if (updateChart) {
      updateChart.data = { ...data, labels: [] };
      updateChart.update();
      return;
    }
    this.charts.push(new Chart(chartName, {
      type: 'bar',
      data,
      options: {
        title: { display: true, text: titleOfChartName(chartName), fontSize: 16 },
        legend: { position: 'bottom' },
        maintainAspectRatio: false,
        scales: {
          xAxes: [ { labels, type: 'category' } ],
          yAxes: [ {
            type: 'linear',
            ticks: { beginAtZero: true, precision: 0, suggestedMax: 10 }
          } ]
        }
      }
    }));
  }

  openExportDialog(reportType: 'logins' | 'resourceViews' | 'courseViews' | 'summary' | 'health' | 'stepCompletions') {
    const minDate = new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0);
    const commonProps = { type: 'date', required: true, min: new Date(minDate), max: new Date(this.today) };
    const teamOptions = [
      { name: $localize`All Members`, value: 'All' },
      ...this.teams.team.map(t => ({ name: t.name, value: t })),
      ...this.teams.enterprise.map(t => ({ name: t.name, value: t }))
    ];
    const commonFields = [
      { placeholder: $localize`From`, name: 'startDate', ...commonProps },
      { placeholder: $localize`To`, name: 'endDate', ...commonProps }
    ];
    const teamField = { placeholder: $localize`Team`, name: 'team', options: teamOptions, type: 'selectbox' };
    const sortingOptions = sortingOptionsMap[reportType];
    const fields = [
      ...commonFields,
      ...(reportType === 'health' ? [] : [ teamField ]),
      ...(sortingOptions && sortingOptions.length > 0
        ? [{ placeholder: $localize`Sort By`, name: 'sortBy', options: sortingOptions, type: 'selectbox' }]
        : [])
    ];
    const formGroup = {
      startDate: this.dateFilterForm.controls.startDate.value,
      endDate: [this.dateFilterForm.controls.endDate.value, CustomValidators.endDateValidator()],
      team: reportType === 'health' ? 'All' : this.selectedTeam,
      sortBy: sortingOptions && sortingOptions.length > 0 ? sortingOptions[0].value : null
    };
    this.dialogsFormService.openDialogsForm($localize`Select Date Range for Data Export`, fields, formGroup, {
      onSubmit: (formValue: any) => {
        this.getTeamMembers(formValue.team).subscribe(members => {
          this.exportCSV(reportType, { startDate: formValue.startDate, endDate: formValue.endDate }, members, formValue.sortBy);
        });
      }
    });
  }
  
  openExportCourseOverviewDialog() {
    console.log('openExportCourseOverviewDialog() called');
    const minDate = new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0);
    const commonProps = { type: 'date', required: true, min: new Date(minDate), max: new Date(this.today) };
    const fields = [
      { placeholder: $localize`From`, name: 'startDate', ...commonProps },
      { placeholder: $localize`To`, name: 'endDate', ...commonProps }
    ];
    const formGroup = {
      startDate: this.dateFilterForm.controls.startDate.value,
      endDate: [this.dateFilterForm.controls.endDate.value, CustomValidators.endDateValidator()]
    };
    this.dialogsFormService.openDialogsForm($localize`Select Date Range for Courses Overview`, fields, formGroup, {
      onSubmit: (formValue: any) => {
        console.log('Courses overview form submitted:', formValue);
        this.exportCourseOverview(formValue.startDate, formValue.endDate);
      }
    });
  }
  
  exportCourseOverview(startDate: Date, endDate: Date) {
    this.dialogsLoadingService.start();
  
    const dateRange = { startDate, endDate };
  
    // Filter course activity data by the date range.
    const filteredCourseData = filterByDate(
      this.courseActivities?.total?.data,
      'time',
      dateRange
    ) as any[];
  
    // Aggregate course statistics.
    const courseStats = filteredCourseData.reduce((stats: { [courseId: string]: CourseStats }, activity: any) => {
      if (!stats[activity.courseId]) {
        stats[activity.courseId] = {
          // Try multiple properties for the course title.
          title: activity.courseTitle || activity.title || activity.max?.title || '',
          steps: activity.steps || 0,
          exams: activity.exams || 0,
          enrollments: 0,
          count: 0,
          stepsCompleted: 0,
          completions: 0,
          rating: 0,
          ratingCount: 0
        };
      }
      stats[activity.courseId].count++; // Increment the view count.
      return stats;
    }, {} as { [courseId: string]: CourseStats });
  
    console.log('Merged course activity data:', this.courseActivities.total.data);
  
    // Process progress data.
    const filteredEnrollments = filterByDate(this.progress.enrollments.data, 'time', dateRange) as any[];
    const filteredCompletions = filterByDate(this.progress.completions.data, 'time', dateRange) as any[];
    const filteredSteps = filterByDate(this.progress.steps.data, 'time', dateRange) as any[];
  
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
  
    // Mimic the UI's rating calculation.
    // Filter the raw ratings data by date and group it as the UI does.
    const filteredRatings = filterByDate(this.ratings.total.data, 'time', dateRange) as any[];
    const averageRatings = this.activityService.groupRatings(filteredRatings);
    // In the UI, the grouped rating objects use the property "item" to denote the course ID.
    const courseRatings = averageRatings.filter((item: any) => item.type === 'course');
  
    courseRatings.forEach((rating: any) => {
      if (courseStats[rating.item]) {
        courseStats[rating.item].rating = rating.rating;
        courseStats[rating.item].ratingCount = rating.ratingCount;
      }
    });
  
    // Map aggregated data to CSV rows.
    const csvData = Object.values(courseStats).map((course: CourseStats) => ({
      'Title': course.title,
      'Steps': course.steps,
      'Exams': course.exams,
      'Enrollments': course.enrollments,
      'Count': course.count,
      'Steps Completed': course.stepsCompleted,
      'Completions': course.completions,
      'Average Rating': course.ratingCount > 0 ? (course.rating / course.ratingCount).toFixed(1) : 'N/A'
    }));
  
    this.csvService.exportCSV({
      data: csvData,
      title: $localize`Courses Overview`
    });
  
    this.dialogsFormService.closeDialogsForm();
    this.dialogsLoadingService.stop();
  }
  
  
  sortData(data: any[], sortBy: string): any[] {
    const order = sortBy.endsWith('Asc') ? 1 : -1;
    let field = sortBy.replace(/Asc|Desc/, '');
    if (field === 'username') { field = 'user'; }
    return data.sort((a, b) => {
      let comparison = 0;
      if ([ 'loginTime', 'logoutTime', 'time' ].includes(field)) {
        const dateA = new Date(a[field]).getTime();
        const dateB = new Date(b[field]).getTime();
        comparison = dateA - dateB;
      } else {
        comparison = a[field].localeCompare(b[field]);
      }
      return comparison * order;
    });
  }
  
  exportCSV(reportType: string, dateRange: { startDate: Date, endDate: Date }, members: any[], sortBy: string) {
    switch (reportType) {
      case 'logins':
        let data = filterByMember(filterByDate(this.loginActivities.data, 'loginTime', dateRange), members)
          .map(activity => ({
            ...activity,
            androidId: activity.androidId || '',
            deviceName: activity.deviceName || '',
            customDeviceName: activity.customDeviceName || ''
          }));
        if (sortBy) {
          data = this.sortData(data, sortBy);
        }
        this.csvService.exportCSV({
          data: data,
          title: $localize`Member Visits`
        });
        break;
      case 'resourceViews':
      case 'courseViews':
      case 'stepCompletions':
        this.exportDocView(reportType, dateRange, members, sortBy);
        break;
      case 'summary':
        this.exportSummary(dateRange, members, sortBy);
        break;
      case 'health':
        this.exportDocView(reportType, dateRange, members, null);
        break;
    }
    this.dialogsFormService.closeDialogsForm();
    this.dialogsLoadingService.stop();
  }
  
  exportSummary(dateRange: any, members: any[], sortBy: string) {
    const loginData = filterByMember(filterByDate(this.loginActivities?.data, 'loginTime', dateRange), members);
    const resourceData = filterByMember(filterByDate(this.resourceActivities?.total?.data, 'time', dateRange), members);
    const courseData = filterByMember(filterByDate(this.courseActivities?.total?.data, 'time', dateRange), members);
    const progressData = filterByMember(filterByDate(this.progress?.steps?.data, 'time', dateRange), members);
  
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
    }
  
    this.csvService.exportSummaryCSV(
      loginData,
      resourceData,
      courseData,
      progressData,
      this.planetName
    );
  }
  
  openCourseView(courseId) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId: courseId },
      minWidth: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }
  
  exportDocView(reportType: string, dateRange: any, members: any[], sortBy: string) {
    let data = {
      'resourceViews': this.resourceActivities.total.data,
      'courseViews': this.courseActivities.total.data,
      'stepCompletions': this.progress.steps.data,
      'health': this.healthComponent && this.healthComponent.examinations
    }[reportType];
    const title = {
      'resourceViews': $localize`Resource Views`,
      'courseViews': $localize`Course Views`,
      'health': $localize`Community Health`,
      'stepCompletions': $localize`Courses Progress` }[reportType];
    if (sortBy) {
      data = this.sortData(data, sortBy);
    }
    this.csvService.exportCSV({
      data: this.activityService.appendAge(
        filterByMember(filterByDate(data, reportType === 'health' ? 'date' : 'time', dateRange), members), this.today)
        .map(activity => ({ ...activity, androidId: activity.androidId || '', deviceName: activity.deviceName || '' })),
      title
    });
  }
  
  goBack() {
    const route = this.codeParam === null ? '../../' : '../';
    this.router.navigate([ route ], { relativeTo: this.route });
  }
  
  openResourceView(resourceId) {
    this.dialog.open(DialogsResourcesViewerComponent, { data: { resourceId }, autoFocus: false });
  }
  
  openMemberView(user) {
    this.dialog.open(UserProfileDialogComponent, {
      data: { member: { name: user.name, userPlanetCode: user.planetCode } },
      autoFocus: false
    });
  }
  
  resetDateFilter({ startDate, endDate }: { startDate?: Date, endDate?: Date } = {}) {
    const newStartDate = startDate || this.minDate;
    const newEndDate = endDate || this.today;
    // Use setTimeout to avoid "ExpressionChangedAfterItHasBeenCheckedError"
    setTimeout(() => {
      this.disableShowAllTime = true;
    });
    this.dateFilterForm.patchValue({
      startDate: newStartDate,
      endDate: newEndDate
    }, { emitEvent: true });
  }
  
}
