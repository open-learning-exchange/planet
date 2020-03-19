import { Component } from '@angular/core';
import { zip } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UsersService } from '../../users/users.service';
import { CoursesService } from '../courses.service';
import { TableState } from '../../users/users-table.component';


@Component({
  templateUrl: './courses-enroll.component.html'
})

export class CoursesEnrollComponent {

  courseId: string;
  course: any;
  members: any[] = [];
  tableState = new TableState();
  emptyData = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private couchService: CouchService,
    private usersService: UsersService,
    private coursesService: CoursesService
  ) {
    this.coursesService.requestCourses();
    this.usersService.requestUserData();
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.courseId = paramMap.get('id');
        return zip(
          this.couchService.findAll('shelf', { 'selector': { 'courseIds': { '$elemMatch': { '$eq': this.courseId } } } }),
          this.coursesService.findProgress([ this.courseId ], { allUsers : true }),
          // Include course listener to ensure requestCourses() is complete.  This updates courses in CoursesService.
          this.coursesService.coursesListener$()
        );
      }),
      take(1)
    ).subscribe(([ shelfUsers, progresses ]) => {
      this.course = this.coursesService.getCourseNameFromId(this.courseId);
      this.members = this.usersService.data.users.concat(this.usersService.data.childUsers)
        .map((user: any) => ({
          ...this.usersService.fullUserDoc(user),
          activityDates: this.userProgress(progresses.filter((progress: any) => progress.userId === user._id))
        })).filter(doc => doc.activityDates.createdDate || shelfUsers.find((u: any) => u._id === doc._id));
      this.emptyData = this.members.length === 0;
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

}
