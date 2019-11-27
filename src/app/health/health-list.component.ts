import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { UsersService } from '../users/users.service';
import { takeUntil, switchMap } from 'rxjs/operators';
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private healthService: HealthService
  ) {}

  ngOnInit() {
    this.usersService.usersUpdated.pipe(
      switchMap(users => {
        this.users = users;
        return forkJoin(users.map(({ _id }) => this.healthService.getHealthData(_id)));
      }),
      takeUntil(this.onDestroy$)
    ).subscribe((healthData: any[]) => {
      this.users = this.users.map(user => {
        const userHealth = healthData.find(data => data._id === user._id) || { events: [] };
        return {
          ...user,
          health: { ...userHealth, lastVisit: userHealth.events.reduce((max, { date }) => date > max ? date : max, null) }
        };
      });
      this.emptyData = this.users.length === 0;
    });
    this.usersService.requestUsers();
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

}
