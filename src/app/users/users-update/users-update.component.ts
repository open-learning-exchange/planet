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
import { UserService } from '../../shared/user.service';
import { environment } from '../../../environments/environment';
import { NgxImgModule } from 'ngx-img';

@Component({
  templateUrl: './users-update.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .view-container {
      background-color: #FFFFFF;
      display: flex;
      flex-wrap: wrap;
      padding: 3rem;
    }
    .view-container form {
      margin: 0 10px 10px 0;
    }
  ` ]
})
export class UsersUpdateComponent implements OnInit {
  user: any = {};
  educationLevel = [ '1', '2', '3', '4', '5', '6' , '7', '8', '9', '11', '12', 'Higher' ];
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup;
  currentProfileImg: string;
  defaultProfileImg = '../assets/image.png';
  previewSrc = '../assets/image.png';
  uploadImage = false;
  urlPrefix = environment.couchAddress + this.dbName + '/';
  urlName = '';
  file: any;
  roles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.userData();
  }


  ngOnInit() {
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName)
      .subscribe((data) => {
        this.user = data;
        this.editForm.patchValue(data);
        if (data['_attachments']) {
          const filename = Object.keys(data._attachments)[0];
          this.currentProfileImg = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
          this.previewSrc = this.currentProfileImg;
          this.uploadImage = true;
        } else {
          this.previewSrc = this.defaultProfileImg;
        }
        console.log('data: ' + data);
      }, (error) => {
        console.log(error);
      });
  }

  userData() {
    this.editForm = this.fb.group({
      firstName: [ '', Validators.required ],
      middleName: '',
      lastName: [ '', Validators.required ],
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

  // TODO: temporary solution, should be in separate module
  // Preferably changed for UUID generating function.
  // Perhaps just incrementing imagenumber by 1 if any chosen could be other alternative
  // http://www.frontcoded.com/javascript-create-unique-ids.html
  uniqueId(): string {
    return 'id-' + Math.random().toString(36).substr(2, 16);
  }

  createAttachmentObj(): object {
    // Unclear if only encoding is base64
    // This ought to cover any encoding as long as the formatting is: ";[encoding],"
    const imgDataArr: string[] = this.file.split(/;\w+,/);
    // Replacing start ['data:'] of content type string
    const contentType: string = imgDataArr[0].replace(/data:/, '');
    const data: string = imgDataArr[1];
    // Create attachment object
    const attachments: object = {};
    attachments[this.uniqueId()] = {
      'content_type': contentType,
      'data': data
    };

    return { '_attachments': attachments };
  }

  handleAttachment(user, formValue) {
    let fileObs: Observable<any>;
    if (this.file) {
      fileObs = of(this.createAttachmentObj());
    } else {
      fileObs = of({});
    }
    fileObs.subscribe((memberImage) => {
      this.updateUser(Object.assign({}, user, formValue, memberImage));
    });
  }

  updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.put(this.dbName + '/org.couchdb.user:' + this.user.name, { ...userInfo }).subscribe((res) => {
      userInfo._rev = res.rev;
      this.userService.set(userInfo);
      this.router.navigate([ '/users/profile/' + this.user.name ]);
    },  (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  goBack() {
    this.router.navigate([ '/users/profile', this.user.name ]);
  }

  onImageSelect(img) {
    this.file = img;
    this.previewSrc = img;
    this.uploadImage = true;
  }

  removeImageFile() {
    this.previewSrc = this.currentProfileImg;
    this.file = null;
    this.uploadImage = false;
  }

}
