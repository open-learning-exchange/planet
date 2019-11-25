import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { UsersService } from '../users/users.service';
import { takeUntil } from 'rxjs/operators';
import { TableState } from '../users/users-table.component';

@Component({
  templateUrl: './health-list.component.html',
})
export class HealthListComponent implements OnInit, OnDestroy {

  searchValue = '';
  onDestroy$ = new Subject<void>();
  users: any[] = [];
  displayedColumns = [ 'name' ];
  tableState = new TableState();
  emptyData = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.usersService.usersUpdated.pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      this.users = users;
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
