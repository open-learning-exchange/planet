import { Component, OnDestroy } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap } from '@angular/router';
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

  constructor(
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
          this.usersService.getAllUsers()
        ]);
      }),
      takeUntil(this.onDestroy$)
    ).subscribe(([ shelfUsers, allUsers ]) => {
      this.course = this.coursesService.getCourseNameFromId(this.courseId);
      this.members = allUsers.filter(user => shelfUsers.find((u: any) => u._id === user._id))
        .map((user: any) => this.usersService.fullUserDoc(user));
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

}
