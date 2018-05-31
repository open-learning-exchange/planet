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
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: 'exams-add.component.html'
})
export class ExamsAddComponent implements OnInit {
  readonly dbName = 'exams'; // make database name a constant
  examForm: FormGroup;
  questionsFormArray: FormArray;
  documentInfo: any = {};
  pageType = 'Add';
  successMessage = 'New exam added';
  steps = [];

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
      passingPercentage: [
        50,
        [ CustomValidators.positiveNumberValidator, Validators.max(100) ]
      ],
      questions: this.fb.array([])
    });
    this.questionsFormArray = <FormArray>this.examForm.controls.questions;
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.successMessage = 'Exam updated successfully';
      this.couchService.get(this.dbName + '/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { _rev: data._rev, _id: data._id };
        this.examForm.patchValue(data);
        if (data.questions) {
          data.questions.forEach((question) => this.addQuestion(question));
        }
      }, (error) => {
        console.log(error);
      });
    }
  }

  onSubmit() {
    if (this.examForm.valid) {
      this.addExam(Object.assign({}, this.examForm.value, this.documentInfo));
    } else {
      Object.keys(this.examForm.controls).forEach(field => {
        const control = this.examForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addExam(examInfo) {
    this.couchService.post(this.dbName, examInfo).subscribe((res) => {
      this.documentInfo = { _id: res.id, _rev: res.rev };
      const courseExam = { ...this.documentInfo, ...examInfo };
      this.coursesService.course.steps[this.coursesService.stepIndex].exam = courseExam;
      this.router.navigate([ this.coursesService.returnUrl ]);
      this.planetMessageService.showMessage(this.successMessage);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addQuestion(question: any = {}) {
    this.questionsFormArray.push(this.fb.group(Object.assign(
      {
        header: '',
        body: '',
        type: 'input'
      },
      question,
      {
        marks: [ question.marks || 1, CustomValidators.positiveNumberValidator ],
        choices: this.fb.array(question.choices || [])
      }
    )));
  }

  removeQuestion(index) {
    this.questionsFormArray.removeAt(index);
  }

  cancel() {
    this.router.navigate([ this.coursesService.returnUrl ]);
  }

}
