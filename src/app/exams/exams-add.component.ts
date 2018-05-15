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
import { CoursesService } from '../courses/courses.service';

@Component({
  templateUrl: 'exams-add.component.html'
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: FormGroup;
  questionsFormArray: FormArray;
  documentInfo = { rev: '', id: '' };
  pageType = 'Add new';
  steps = [];
  questions = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService
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
    this.questionsFormArray = <FormArray>this.examForm.controls.questions;
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { rev: data._rev, id: data._id };
        if (data.questions) {
          data.questions.map(question => { this.addQuestion(question); });
        }
        this.examForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
    }
  }

  onSubmit() {
    if (this.examForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.addExam(this.examForm.value);
      } else {
        this.addExam(this.examForm.value);
      }
    } else {
      Object.keys(this.examForm.controls).forEach(field => {
        const control = this.examForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addExam(examInfo) {
    this.couchService.post(this.dbName, examInfo).subscribe((res) => {
      const courseExam = { _id: res.id, _rev: res.rev, ...examInfo };
      this.coursesService.course.steps[this.coursesService.stepIndex].exam = courseExam;
      this.router.navigate([ this.coursesService.returnUrl ]);
      this.planetMessageService.showMessage('New exam added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  updateExam(examInfo) {
    this.couchService.put(
      this.dbName + '/' + this.documentInfo.id,
      { ...examInfo, '_rev': this.documentInfo.rev, steps: this.steps }
    ).subscribe((res) => {
      const courseExam = { _id: res.id, _rev: res.rev, ...examInfo };
      this.coursesService.course.steps[this.coursesService.stepIndex].exam = courseExam;
      this.router.navigate([ this.coursesService.returnUrl ]);
      this.planetMessageService.showMessage('Exam updated successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addQuestion(question = {}) {
    this.questionsFormArray.push(this.fb.group({
      header: '',
      body: '',
      type: 'input',
      choices: this.fb.array([])
    }));
    this.questions.push(question);
  }

  removeQuestion(index) {
    this.questionsFormArray.removeAt(index);
  }

  cancel() {
    this.router.navigate([ this.coursesService.returnUrl ]);
  }

}
