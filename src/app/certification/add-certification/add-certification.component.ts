import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CouchService } from '../../shared/couchdb.service';
import { switchMap } from 'rxjs/operators';
import { findDocuments } from '../../shared/mangoQueries';

@Component({
  selector: 'app-add-certification',
  templateUrl: './add-certification.component.html',
  styles: [ `
  form.form-spacing {
    width: inherit;
  }
  .actions-container {
    align-self: center;
  }
  .view-container form {
    min-width: 385px;
    max-width: 750px;
  }
  ` ]
})
export class AddCertificationComponent implements OnInit {

  @Input() isDialog = false;
  @Output() onGoBack = new EventEmitter<any>();
  @Input() link: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  pageType = 'Add new';
  @Input() certification: any = {};
  certificationForm: FormGroup;
  readonly dbName = 'certifications'; // database name constant
  id = null;
  revision = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {
    this.createForm();
  }

  ngOnInit() {
    if (this.certification._id) {
      this.setCertificationData({ ...this.certification });
    }
    if (!this.isDialog && this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('meetups/' + this.route.snapshot.paramMap.get('id')).subscribe(
        data => this.setCertificationData(data),
        error => console.log(error)
      );
    }
  }

  setCertificationData(certification: any) {
    this.pageType = 'Update';
    this.revision = certification._rev;
    this.id = certification._id;
    this.certificationForm.patchValue(certification);
  }

  onSubmit() {
    if (!this.certificationForm.valid) {
      Object.keys(this.certificationForm.controls).forEach(field => {
        const control = this.certificationForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
      return;
    }
    const certification = { ...this.certificationForm.value };
    if (this.pageType === 'Update') {
      // this.updateCertification(certification);
      console.log("hello world")
    } else {
      this.addCertification(certification);
    }
  }

  addCertification(certificationInfo) {
    this.couchService.updateDocument(this.dbName, {
      ...certificationInfo,
      'name': certificationInfo.name,
    }).subscribe((res) => {
      this.goBack(res);
      this.planetMessageService.showMessage(certificationInfo.name + ' Added');
    }, (err) => console.log(err));
  }

  createForm() {
    this.certificationForm = this.fb.group({
      name: [ '', CustomValidators.required]
    });
  }

  cancel() {
    this.goBack();
  }

  goBack(res?) {
    if (this.isDialog) {
      this.onGoBack.emit(res);
    } else {
      this.router.navigate([ '/manager/certification' ]);
    }
  }

}
