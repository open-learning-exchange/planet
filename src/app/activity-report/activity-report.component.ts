import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTableDataSource, MatFormField, MatFormFieldControl } from '@angular/material';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './activity-report.component.html'
})

export class ActivityReportComponent implements OnInit {
  reportActivities = new MatTableDataSource();
  displayedColumns = ['register', 'total', 'male', 'female'];
  reportForm: FormGroup;
  
  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService,
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    this.getMemberlog();
    this.reportForm = this.fb.group({
      startdate: [ '' ],
      enddate: [''],

    });

  }

  getMemberlog() {
    this.couchService.allDocs('_users')
    .subscribe((data) =>{
      this.reportActivities.data = data.map((a) => {
        console.log(a)
        const total = a.length
        console.log("tot", total)
        return a;
      })
    });
    
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

}
