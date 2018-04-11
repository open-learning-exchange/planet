import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTableDataSource, MatFormField, MatFormFieldControl } from '@angular/material';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';


@Component({
  templateUrl: './activity-report.component.html'
})

export class ActivityReportComponent implements OnInit {
  reportActivities = new MatTableDataSource();
  displayedColumns = [ 'register', 'total', 'male', 'female' ];
  reportForm: FormGroup;
  totalUsers = 0;
  maleCount = 0;
  femaleCount = 0;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService,
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    this.getMemberlog();
    this.getLogActivities();

    this.reportForm = this.fb.group({
      startdate: [ '' ],
      enddate: [ '' ],

    });

  }

  getLogActivities() {
    this.couchService.allDocs('_users')
    .subscribe((log) => {
      let totalMaleLog = 0;
      let totalFemaleLog = 0;
      log.map((res: any) => {
        switch (res.gender) {
          case 'male':
          this.couchService.post('login_activities/_find', { 'selector': { 'user': res.name } })
          .subscribe((result) => {
            totalMaleLog = totalMaleLog + result.docs.length;
            console.log('male', totalMaleLog );
          });
          break;
          case 'female':
          this.couchService.post('login_activities/_find', { 'selector': { 'user': res.name } })
          .subscribe((result) => {
            totalFemaleLog = totalFemaleLog + result.docs.length;
            console.log('fem', totalFemaleLog );
          });
          break;
        }
      });
      console.log('malefemale', totalFemaleLog, totalMaleLog);
      this.reportActivities.data.push({ membersActivities: 'Login Activities',
      totalUsers: totalFemaleLog + totalMaleLog, totalMaleCount: totalMaleLog, totalFemaleCount: totalFemaleLog });
    });
  }

  getMemberlog() {
    this.couchService.allDocs('_users')
    .subscribe((data) => {
      this.totalUsers = data.length;
      data.map((res: any) => {
        switch (res.gender) {
          case 'male':
            this.maleCount = this.maleCount + 1;
            break;
          case 'female':
            this.femaleCount = this.femaleCount + 1;
            break;
       }
      });
      this.reportActivities.data.push({ membersActivities: 'Registered Member',
      totalUsers: data.length, totalMaleCount: this.maleCount, totalFemaleCount: this.femaleCount });
    });
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

}
