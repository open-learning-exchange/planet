import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, concat } from 'rxjs';
import { UsersService } from '../users/users.service';
import { takeUntil } from 'rxjs/operators';
import { TableState } from '../users/users-table.component';
import { HealthService } from './health.service';

@Component({
  templateUrl: './health-list.component.html',
})
export class HealthListComponent implements OnInit, OnDestroy {

  searchValue = '';
  onDestroy$ = new Subject<void>();
  users: any[] = [];
  displayedColumns = [ 'profile', 'name', 'contact', 'birthDate', 'lastVisit' ];
  tableState = new TableState();
  emptyData = true;
  healthRequests: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private healthService: HealthService
  ) {}

  ngOnInit() {
    this.usersService.usersUpdated.pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      this.users = users;
      this.emptyData = this.users.length === 0;
    });
    this.usersService.requestActivitiesAndChildren();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  back() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  resetFilter() {
    this.searchValue = '';
  }

  tableDataChange(newData) {
    const usersWithoutHealth = newData.filter(user => !user.health && this.healthRequests.indexOf(user._id) === -1);
    this.healthRequests = [ ...this.healthRequests, ...usersWithoutHealth.map(user => user._id) ];
    if (usersWithoutHealth.length === 0) {
      return;
    }
    concat.apply(null, usersWithoutHealth.map(({ _id }) => this.healthService.getHealthData(_id))).subscribe((userHealth: any) => {
      this.users = this.users.map(user => user._id === userHealth._id ?
        {
          ...user,
          health: { ...userHealth, lastVisit: userHealth.events.reduce((max, { date }) => date > max ? date : max, null) }
        } :
        user
      );
    });
  }

}
