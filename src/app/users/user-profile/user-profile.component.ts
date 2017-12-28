import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { Location } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { MatFormField, MatFormFieldControl } from '@angular/material';

@Component({
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  user: any;
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup;
  file: any;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.userData();
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }

  userData() {
    this.editForm = this.fb.group({
      firstName: [ '', Validators.required ],
      middleName: '',
      lastName: [ '', Validators.required ],
      login: '',
      email: [ '', [ Validators.required,  Validators.pattern ('[^ @]*@[^ @]*') ] ],
      language: [ '', Validators.required ],
      phoneNumber: [ '', Validators.required ],
      birthDate: [ '', Validators.required ],
      gender: [ '', Validators.required ],
      level: [ '', Validators.required ]
    });
    this.editForm.setValue({firstName: '', middleName: '', lastName: '', login: '', email: '', language: ''
      , phoneNumber: '', birthDate: '', gender: '', level: ''});
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.userService.get().name)
      .subscribe((data) => {
        this.user = data;
        this.editForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
  }

  // Creates an observer which reads one file then outputs its data
  private fileReaderObs (file) {
    const reader = new FileReader();
    const obs = Observable.create((observer) => {
      reader.onload = () => {
        // FileReader result has file type at start of string, need to remove for CouchDB
        const fileData = reader.result.split(',')[1],
        attachments = {};
        attachments[file.name] = {
          content_type: file.type,
          data: fileData
        };
        const memberImage = {
          _attachments: attachments
        };
        observer.next(memberImage);
        observer.complete();
      };
    });
    reader.readAsDataURL(file);
    return obs;
  }

  onSubmit() {
    if (this.editForm.valid) {
      let fileObs: Observable<any>;
      if(this.file && this.file.type.indexOf('image') > -1) {
        fileObs = this.fileReaderObs(this.file);
      } else {
        fileObs = of({});
      }
      fileObs.subscribe((memberImage) => {
        this.updateUser(Object.assign({}, this.user, this.editForm.value, memberImage));
      });
    } else {
        Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.put(this.dbName + '/org.couchdb.user:' + this.userService.get().name, { ...userInfo }).subscribe(() => {
      this.router.navigate([ '' ]);
    },  (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  cancel() {
    this.location.back();
  }

  bindFile(event) {
    this.file = event.target.files[0];
  }
}
