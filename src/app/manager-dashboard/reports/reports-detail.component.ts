import { Component, OnInit, OnDestroy, ViewEncapsulation, HostBinding, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { combineLatest, Subject, of } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Chart } from 'chart.js';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
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
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';
import { ReportsDetailData, ReportDetailFilter } from './reports-detail-data';
import { UsersService } from '../../users/users.service';
import { CoursesViewDetailDialogComponent } from '../../courses/view-courses/courses-view-detail.component';
import { ReportsHealthComponent } from './reports-health.component';
import { UserProfileDialogComponent } from '../../users/users-profile/users-profile-dialog.component';
import { findDocuments } from '../../shared/mangoQueries';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';

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
  showFiltersRow = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  dateQueryParams = {
    startDate: null,
    endDate: null
  };

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private dialogsLoadingService: DialogsLoadingService,
    private csvService: CsvService,
    private dialogsFormService: DialogsFormService,
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private deviceInfoService: DeviceInfoService,
  ) {
    this.initDateFilterForm();
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1200 });
  }

  ngOnInit() {
    const dbName = 'communityregistrationrequests';
    this.dialogsLoadingService.start();
    this.couchService.currentTime().subscribe((currentTime: number) => {
      this.today = new Date(new Date(currentTime).setHours(0, 0, 0));

      combineLatest(this.route.paramMap, this.route.queryParams, this.stateService.couchStateListener(dbName))
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(([ params, queryParams, planetState ]: [ ParamMap, ParamMap, any ]) => {
        if (planetState === undefined) {
          return;
        }
        const planets = attachNamesToPlanets((planetState && planetState.newData) || []);
        this.dateQueryParams = {
          startDate: new Date(new Date(queryParams['startDate']).setHours(0, 0, 0, 0)),
          endDate: new Date(new Date(queryParams['endDate']).setHours(0, 0, 0))
        };
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
  }

  @HostListener('window:resize')
  OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1200 });
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

  setDocVisits(type, isInit = false) {
    // This method is now only used for initial data setup, not for filtering
    const params = reportsDetailParams(type);
    if (isInit) {
      // Only if this is the initial setup, we'll set up the reports data
      const idField = type.replace('Activities', 'Id');
      const grouped = this.groupActivities(this[type].total.filteredData, idField);
      this[type].byDoc = grouped;
      this.reports[params.views] = this[type].total.filteredData.length;
      this.reports[params.record] = grouped
        .filter(item => item[idField])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const byMonth = this.activityService.groupByMonth(
        this.activityService.appendGender(this[type].total.filteredData),
        'time'
      );
      this.setChart({ ...this.setGenderDatasets(byMonth), chartName: params.chartName });

      if (isInit && type === 'courseActivities') {
        this.getCourseProgress();
      }
    }
  }

  setUserCounts({ count, byGender }) {
    this.reports.totalUsers = count;
    this.reports.usersByGender = byGender;
  }

  initDateFilterForm() {
    this.dateFilterForm = this.fb.group({
      startDate: [ '' ],
      endDate: [ '' ],
      validators: [ CustomValidators.endDateValidator() ]
    });
    this.dateFilterForm.valueChanges.subscribe(value => {
      const startDate = value.startDate ? new Date(value.startDate) : null;
      const endDate = value.endDate ? new Date(value.endDate) : null;

      this.filter = { ...this.filter, startDate, endDate };

      if (startDate && endDate && this.minDate && this.today) {
        const formatDate = (date: Date) => {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
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

    // Filter resource activities and properly update both the data and the UI
    this.resourceActivities.total.filter(this.filter);
    // Generate proper groups after filtering
    const resourceIdField = 'resourceId';
    const resourceGrouped = this.groupActivities(this.resourceActivities.total.filteredData, resourceIdField);
    this.resourceActivities.byDoc = resourceGrouped;
    this.reports.totalResourceViews = this.resourceActivities.total.filteredData.length;
    this.reports.resources = resourceGrouped
      .filter(item => item[resourceIdField])
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    // Update resource charts
    const resourceByMonth = this.activityService.groupByMonth(
      this.activityService.appendGender(this.resourceActivities.total.filteredData),
      'time'
    );
    this.setChart({ ...this.setGenderDatasets(resourceByMonth), chartName: 'resourceViewChart' });

    // Filter course activities and properly update both the data and the UI
    this.courseActivities.total.filter(this.filter);
    // Generate proper groups after filtering
    const courseIdField = 'courseId';
    const courseGrouped = this.groupActivities(this.courseActivities.total.filteredData, courseIdField);
    this.courseActivities.byDoc = courseGrouped;
    this.reports.totalCourseViews = this.courseActivities.total.filteredData.length;
    this.reports.courses = courseGrouped
      .filter(item => item[courseIdField])
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    // Update course charts
    const courseByMonth = this.activityService.groupByMonth(
      this.activityService.appendGender(this.courseActivities.total.filteredData),
      'time'
    );
    this.setChart({ ...this.setGenderDatasets(courseByMonth), chartName: 'courseViewChart' });

    // Progress data
    this.progress.enrollments.filter(this.filter);
    this.progress.completions.filter(this.filter);
    this.progress.steps.filter(this.filter);
    this.setStepCompletion();

    // User data
    this.setUserCounts(this.activityService.groupUsers(
      this.users.filter(
        user => this.filter.members.length === 0 || this.filter.members.some(
          member => member.userId === user._id && member.userPlanetCode === user.doc.planetCode
        )
      )
     ));

    // Chat data
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
      this.dateFilterForm.controls.startDate.setValue(
        this.dateQueryParams.startDate instanceof Date && !isNaN(this.dateQueryParams.startDate.getTime())
        ? this.dateQueryParams.startDate : this.minDate
      );
      this.setLoginActivities();
    });
    this.usersService.requestUserData();
  }

  setStepCompletion() {
    const { byMonth } = this.activityService.groupStepCompletion(this.progress.steps.filteredData);
    // Fix TypeScript error by adding type annotation to doc parameter
    this.reports.totalStepCompleted = byMonth.reduce((total: number, doc: { count: number }) => total + doc.count, 0);
    this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'stepCompletedChart' });
  }

  setLoginActivities() {
    const { byUser, byMonth } = this.activityService.groupLoginActivities(this.loginActivities.filteredData);
    // Fix TypeScript error by adding type annotation to resource parameter
    this.reports.totalMemberVisits = byUser.reduce((total: number, resource: { count: number }) => total + resource.count, 0);
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
    ]).subscribe(([ { enrollments, completions, steps }, courses ]: [ any, any[] ]) => {
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
      this.filterData();
    });
  }

  getDocVisits(type) {
    const params = reportsDetailParams(type);
    this.couchService.findAll(params.db).subscribe((allActivities: any) => {
      const filtered = allActivities.filter(
        activity => (activity._id || '').indexOf('_design') === -1
      );
      this[type].total.data = filtered;
      this[type].total.filteredData = filtered;
      this.setDocVisits(type, true);
    });
  }

  groupActivities(activities, idField) {
    const groupMap: { [key: string]: any } = {};
    activities.forEach(activity => {
      const id = activity[idField];
      if (!id) {
        return;
      }

      if (!groupMap[id]) {
        groupMap[id] = {
          [idField]: id,
          title: activity.title || activity.resourceTitle || activity.courseTitle || '',
          count: 0,
          unique: [],
          time: activity.time || 0,
          max: {
            title: activity.title || activity.resourceTitle || activity.courseTitle || id,
            steps: activity.steps || 0,
            exams: activity.exams || 0
          }
        };
      }

      groupMap[id].count++;

      if (activity.user && !groupMap[id].unique.includes(activity.user)) {
        groupMap[id].unique.push(activity.user);
      }

      if (activity.time > groupMap[id].time) {
        groupMap[id].time = activity.time;
        if (activity.title || activity.resourceTitle || activity.courseTitle) {
          groupMap[id].max.title = activity.title || activity.resourceTitle || activity.courseTitle || id;
        }
      }
    });
    return Object.values(groupMap);
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

  openExportDialog(reportType: 'logins' | 'resourceViews' | 'courseViews' | 'summary' | 'health' | 'stepCompletions' | 'coursesOverview') {
    const minDate = new Date(this.activityService.minTime(this.loginActivities.data, 'loginTime')).setHours(0, 0, 0, 0);
    const commonProps = { type: 'date', required: true, min: new Date(minDate), max: new Date(this.today) };
    if (reportType === 'coursesOverview') {
      const coursesFields = [
        { placeholder: $localize`From`, name: 'startDate', ...commonProps },
        { placeholder: $localize`To`, name: 'endDate', ...commonProps }
      ];
      const coursesFormGroup = {
        startDate: this.dateFilterForm.controls.startDate.value,
        endDate: [ this.dateFilterForm.controls.endDate.value, CustomValidators.endDateValidator() ]
      };
      this.dialogsFormService.openDialogsForm($localize`Select Date Range for Courses Overview`, coursesFields, coursesFormGroup, {
        onSubmit: (formValue: any) => {
          this.exportCourseOverview(formValue.startDate, formValue.endDate);
        }
      });
      return;
    }
    const teamOptions = [
      { name: $localize`All Members`, value: 'All' },
      ...this.teams.team.map(t => ({ name: t.name, value: t })),
      ...this.teams.enterprise.map(t => ({ name: t.name, value: t }))
    ];
    const commonFields = [
      { 'placeholder': $localize`From`, 'name': 'startDate', ...commonProps },
      { 'placeholder': $localize`To`, 'name': 'endDate', ...commonProps }
    ];
    const teamField = { 'placeholder': $localize`Team`, 'name': 'team', 'options': teamOptions, 'type': 'selectbox' };
    const sortingOptions = sortingOptionsMap[reportType];
    const fields = [
      ...commonFields,
      ...(reportType === 'health' ? [] : [ teamField ]),
      ...(sortingOptions && sortingOptions.length > 0
        ? [ { 'placeholder': $localize`Sort By`, 'name': 'sortBy', 'options': sortingOptions, 'type': 'selectbox' } ]
        : [])
    ];
    const formGroup = {
      startDate: this.dateFilterForm.controls.startDate.value,
      endDate: [ this.dateFilterForm.controls.endDate.value, CustomValidators.endDateValidator() ],
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

  exportCourseOverview(startDate: Date, endDate: Date) {
    this.dialogsLoadingService.start();
    const dateRange = { startDate, endDate };
    const filteredCourseData = filterByDate(
      this.courseActivities?.total?.data,
      'time',
      dateRange
    ) as any[];
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

    console.log('Merged course activity data:', this.courseActivities.total.data);
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
    Object.keys(courseStats).forEach(courseId => {
      const foundRating = (this.ratings.courses || []).find((rating: any) => rating.item === courseId);
      courseStats[courseId].averageRating = foundRating ? foundRating.value : '';
    });
    const planetForLink = (this.stateService.configuration.planetName ||
                            this.planetName ||
                            'default').toLowerCase();
    const baseUrl = `https://planet.${planetForLink}.ole.org/courses/view/`;
    const csvData = Object.entries(courseStats).map(([ courseId, course ]: [string, any]) => ({
      'Title': course.title,
      'Link': baseUrl + courseId,
      'Steps': course.steps,
      'Exams': course.exams,
      'Enrollments': course.enrollments,
      'Views': course.count,
      'Steps Completed': course.stepsCompleted,
      'Completions': course.completions,
      'Average Rating': course.averageRating
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
