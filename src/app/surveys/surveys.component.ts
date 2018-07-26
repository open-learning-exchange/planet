import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { CouchService } from '../shared/couchdb.service';
import { filterSpecificFields } from '../shared/table-helpers';

@Component({
  'templateUrl': './surveys.component.html'
})
export class SurveysComponent implements OnInit, AfterViewInit {

  surveys = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'action' ];

  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.getSurveys().subscribe((surveys) => {
      this.surveys.data = surveys;
    });
  }

  ngAfterViewInit() {
    this.surveys.sort = this.sort;
    this.surveys.paginator = this.paginator;
  }

  getSurveys() {
    return this.couchService.findAll('exams', { 'selector': { 'type': 'surveys' } });
  }

  goBack() {
    this.router.navigate([ '/manager' ]);
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'surveys' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
  }

}
