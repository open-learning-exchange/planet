import { Component, OnDestroy } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UsersService } from '../../users/users.service';
import { CoursesService } from '../courses.service';
import { TableState } from '../../users/users-table.component';


@Component({
  templateUrl: './courses-enroll.component.html'
})

export class CoursesEnrollComponent implements OnDestroy {

  onDestroy$ = new Subject<void>();
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
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.courseId = paramMap.get('id');
        return forkJoin([
          this.couchService.findAll('shelf', { 'selector': { 'courseIds': { '$elemMatch': { '$eq': this.courseId } } } }),
          this.usersService.getAllUsers(),
          this.coursesService.findProgress([ this.courseId ], { allUsers : true })
        ]);
      }),
      takeUntil(this.onDestroy$)
    ).subscribe(([ shelfUsers, allUsers, progresses ]) => {
      this.course = this.coursesService.getCourseNameFromId(this.courseId);
      this.members = allUsers.filter(user => shelfUsers.find((u: any) => u._id === user._id))
        .map((user: any) => ({
          ...this.usersService.fullUserDoc(user),
          activityDates: this.userProgress(progresses.filter((progress: any) => progress.userId === user._id))
        }));
      this.emptyData = this.members.length === 0;
    });
  }

  userProgress(progresses) {
    return progresses.reduce((activityDates, progress) => ({
      createdDate: Math.min(progress.createdDate, activityDates.createdDate),
      updatedDate: Math.max(progress.updatedDate, activityDates.updatedDate)
    }));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  back() {
    this.router.navigate([ '../..' ], { relativeTo: this.route });
  }

}
