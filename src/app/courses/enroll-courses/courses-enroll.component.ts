import { Component } from '@angular/core';
import { zip } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UsersService } from '../../users/users.service';
import { CoursesService } from '../courses.service';
import { TableState } from '../../users/users-table.component';
import { StateService } from '../../shared/state.service';
import { ManagerService } from '../../manager-dashboard/manager.service';
import { attachNamesToPlanets } from '../../manager-dashboard/reports/reports.utils';


@Component({
  templateUrl: './courses-enroll.component.html'
})

export class CoursesEnrollComponent {

  courseId: string;
  course: any;
  members: any[] = [];
  tableState = new TableState();
  emptyData = false;
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
    private managerService: ManagerService
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
    this.router.navigate([ '../..' ], { relativeTo: this.route });
  }

  setMembers([ shelfUsers, progresses, users, childPlanets, courses ]) {
    this.course = this.coursesService.getCourseNameFromId(this.courseId);
    const planets = [ { doc: this.stateService.configuration }, ...attachNamesToPlanets(childPlanets) ];
    this.members = users.filter(user => planets.some(planet => planet.doc.code === user.doc.planetCode)).map((user: any) => ({
        ...user,
        activityDates: this.userProgress(progresses.filter(
          (progress: any) => progress.createdOn === user.doc.planetCode && progress.userId === (user.doc.couchId || user._id))
        ),
        planet: planets.find(planet => planet.doc.code === user.doc.planetCode)
      })).filter(doc => doc.activityDates.createdDate || shelfUsers.find((u: any) => u._id === doc._id));
    this.emptyData = this.members.length === 0;
  }

}
