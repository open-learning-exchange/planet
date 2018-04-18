import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: 'exams-add.component.html'
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: FormGroup;
  documentInfo = { rev: '', id: '' };
  pageType = 'Add new';
  steps = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService
  ) {
    this.createForm();
  }

  createForm() {
    this.examForm = this.fb.group({
      name: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
        ? ac => this.validatorService.isNameAvailible$(this.dbName, 'name', ac, this.route.snapshot.params.id)
        : ac => this.validatorService.isUnique$(this.dbName, 'name', ac)
      ],
      questions: this.fb.array([])
    });
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { rev: data._rev, id: data._id };
        this.examForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
    }
  }

  onSubmit() {
    if (this.examForm.valid) {
      this.addExam(this.examForm.value);
    } else {
      Object.keys(this.examForm.controls).forEach(field => {
        const control = this.examForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addExam(examInfo) {
    this.couchService.post(this.dbName, examInfo).subscribe(() => {
      this.router.navigate([ '/courses' ]);
      this.planetMessageService.showMessage('New exam added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addStep() {
    this.examForm.controls.questions.push(this.fb.group({
      header: '',
      body: '',
      type: 'input',
    }));
  }

  cancel() {
    this.router.navigate([ '/courses' ]);
  }

}
