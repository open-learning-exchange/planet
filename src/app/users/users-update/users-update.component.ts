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
import { languages } from '../../shared/languages';

@Component({
  templateUrl: './users-update.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .view-container {
      display: flex;
      flex-wrap: wrap;
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
  currentImgKey: string;
  currentProfileImg: string;
  defaultProfileImg = '../assets/image.png';
  previewSrc = '../assets/image.png';
  uploadImage = false;
  urlPrefix = environment.couchAddress + this.dbName + '/';
  urlName = '';
  redirectUrl = '/';
  file: any;
  roles: string[] = [];
  languages = languages;

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
        if (this.user.gender) {
          this.redirectUrl = '/users/profile/' + this.user.name;
        }
        this.editForm.patchValue(data);
        if (data['_attachments']) {
          // If multiple attachments this could break? Entering the if-block as well
          this.currentImgKey = Object.keys(data._attachments)[0];
          this.currentProfileImg = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + this.currentImgKey;
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
      const attachment = this.file ? this.createAttachmentObj() : {};
      this.updateUser(Object.assign({}, this.user, this.editForm.value, attachment));
    } else {
        Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
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
    // Alter between two possible keys for image element to ensure database updates
    const imgKey: string = this.currentImgKey === 'img' ? 'img_' : 'img';
    attachments[imgKey] = {
      'content_type': contentType,
      'data': data
    };

    return { '_attachments': attachments };
  }

  updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.put(this.dbName + '/org.couchdb.user:' + this.user.name, { ...userInfo }).subscribe((res) => {
      userInfo._rev = res.rev;
      this.userService.set(userInfo);
      this.router.navigate([ this.redirectUrl ]);
    },  (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  goBack() {
    this.router.navigate([ this.redirectUrl ]);
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
