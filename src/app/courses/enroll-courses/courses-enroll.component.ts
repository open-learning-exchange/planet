import { Component, Inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { zip } from 'rxjs';
import { switchMap, take, finalize } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { NavigationService } from '../../shared/navigation.service';
import { CouchService } from '../../shared/couchdb.service';
import { UsersService } from '../../users/users.service';
import { CoursesService } from '../courses.service';
import { TableState, UsersTableComponent } from '../../users/users-table.component';
import { StateService } from '../../shared/state.service';
import { ManagerService } from '../../manager-dashboard/manager.service';
import { attachNamesToPlanets } from '../../manager-dashboard/reports/reports.utils';
import { CsvService } from '../../shared/csv.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  templateUrl: './courses-enroll.component.html',
  imports: [MatToolbar, MatIconButton, MatIcon, MatButton, UsersTableComponent]
})

export class CoursesEnrollComponent {

  isLoading = true;
  courseId: string;
  course: any;
  members: any[] = [];
  tableState = new TableState();
  userTableColumns = [
    'profile',
    'name',
    ...(this.stateService.configuration.planetType === 'community' ? [] : [ 'planet' ]),
    'startDate',
    'recentDate'
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private couchService: CouchService,
    private usersService: UsersService,
    private coursesService: CoursesService,
    private stateService: StateService,
    private managerService: ManagerService,
    private csvService: CsvService,
    private navigationService: NavigationService,
    @Inject(LOCALE_ID) private localeId: string
  ) {
    this.coursesService.requestCourses();
    this.usersService.requestUserData();
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.courseId = paramMap.get('id');
        return zip(
          this.couchService.findAll('shelf', { 'selector': { 'courseIds': { '$elemMatch': { '$eq': this.courseId } } } }),
          this.coursesService.findProgress([ this.courseId ], { allUsers : true }),
          this.usersService.usersListener(true),
          this.managerService.getChildPlanets(),
          // Include course listener to ensure requestCourses() is complete.  This updates courses in CoursesService.
          this.coursesService.coursesListener$()
        );
      }),
      take(1)
    ).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe((responses) => {
      this.setMembers(responses);
    });
  }

  userProgress(progresses) {
    return progresses.reduce((activityDates, progress) => ({
      createdDate: Math.min(progress.createdDate, activityDates.createdDate),
      updatedDate: Math.max(progress.updatedDate, activityDates.updatedDate)
    }), progresses[0] || {});
  }

  back() {
    this.navigationService.back([ '../..' ], { relativeTo: this.route });
  }

  setMembers([ shelfUsers, progresses, users, childPlanets, courses ]) {
    this.course = this.coursesService.getCourseNameFromId(this.courseId);
    const planets = [ { doc: this.stateService.configuration }, ...attachNamesToPlanets(childPlanets) ];
    this.members = users.map((user: any) => ({
      ...user,
      activityDates: this.userProgress(progresses.filter(
        (progress: any) => progress.createdOn === user.doc.planetCode && progress.userId === (user.doc.couchId || user._id))
      ),
      planet: planets.find(planet => planet.doc.code === user.doc.planetCode)
    })).filter(doc => doc.planet !== undefined && (doc.activityDates.createdDate || shelfUsers.find((u: any) => u._id === doc._id)));
  }

  exportCSV() {
    const csvData = this.members.map((user: any) => {
      return {
        [$localize`username`]: user.doc.name,
        [$localize`Date Started`]: user.activityDates.createdDate
          ? formatDate(user.activityDates.createdDate, 'mediumDate', this.localeId)
          : $localize`N/A`,
        [$localize`Most Recent Activity`]: user.activityDates.updatedDate
          ? formatDate(user.activityDates.updatedDate, 'mediumDate', this.localeId)
          : $localize`N/A`,
      };
    });
    this.csvService.exportCSV({
      data: csvData,
      title: $localize`Course Enrollment Data - ${this.course}`,
    });
  }
}
