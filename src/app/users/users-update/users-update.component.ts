import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { MatFormField, MatFormFieldControl } from '@angular/material';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './users-update.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .view-container {
      background-color: #FFFFFF;
      padding: 3rem;
    }
    .profile-upload-view {
      height: 200px;
      width: 185px;
      margin-top: -300px;
      margin-left: 530px;
      padding: 3rem;
    }
    .profile-upload-image {
      height: 180px;
      width: 155px;
      margin-top: -50px;
      padding: 0.5rem;
    }
  ` ]
})
export class UsersUpdateComponent implements OnInit {
  user: any;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup;
  uploadImage = false;
  file: any;
  roles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.userData();
  }

  ngOnInit() {
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.route.snapshot.paramMap.get('name'))
      .subscribe((data) => {
        this.user = data;
        this.editForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
  }

  userData() {
    this.editForm = this.fb.group({
      firstName: [ '', Validators.required ],
      middleName: '',
      lastName: [ '', Validators.required ],
      name: '',
      login: [ { value: '', disabled: true }, Validators.required ],
      email: [ '', [ Validators.required, Validators.email ] ],
      language: [ '', Validators.required ],
      phoneNumber: [ '', Validators.required ],
      birthDate: [ '', Validators.required ],
      gender: [ '', Validators.required ],
      level: [ '', Validators.required ]
    });
  }

  onSubmit() {
    if (this.editForm.valid) {
      this.handleAttachment(this.user, this.editForm.value);
    } else {
        Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  handleAttachment(user, formValue) {
    let fileObs: Observable<any>;
    if (this.file && this.file.type.indexOf('image') > -1) {
      fileObs = this.couchService.prepAttachment(this.file);
    } else {
      fileObs = of({});
    }
    fileObs.subscribe((memberImage) => {
      this.updateUser(Object.assign({}, user, formValue, memberImage));
    });
  }

  updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.put(this.dbName + '/org.couchdb.user:' + this.user.name, { ...userInfo }).subscribe(() => {
      this.router.navigate([ '/users/profile/' + this.user.name ]);
    },  (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }


  goBack() {
    this.router.navigate([ '/users/profile', this.user.name ]);
  }

  previewFile(event) {
    const preview = <HTMLImageElement>document.querySelector('.profile-upload-image');
    this.file = event.target.files[0];
    const reader  = new FileReader();

    reader.addEventListener('load', function () {
      preview.src = reader.result;
    }, false);

    if (this.file) {
      reader.readAsDataURL(this.file);
    }
    this.uploadImage = true;
  }

  removeFile() {
    const preview = <HTMLImageElement>document.querySelector('.profile-upload-image');
    preview.src = '../assets/image.png';
    this.uploadImage = false;
  }

  changeFile() {
    this.planetMessageService.showMessage('Please change image at file upload.');
  }
}
