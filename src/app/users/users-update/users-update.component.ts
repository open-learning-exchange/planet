import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
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
          this.previewSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
          this.uploadImage = true;
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
    // let imageName = ""; not sure if I'll need to give the image a name
    // img is a base64 encodeded image
    let metaData = new RegExp(/^data:image\/\w+;base64,/gi)
    let croppedImg = img.replace(metaData, "");
    //remove the metadata above
    let blob = new Blob([croppedImg]);
    //try to create a blob to feed into fileReader below 
    let previewImageSource;
    
    //let d = new Date().valueOf();

    // switch (img.split(";")[0].split("/")[1]) {
    //   case "jpeg":
    //     imageName = d+".jpg"
    //     break;
    //   case "png":
    //     imageName = d+".png"
    //     break;
    //   case "x-icon":
    //     imageName = d+".ico"
    //     break;  
    //   default:
    //     break;
    // }

    const reader  = new FileReader();
    reader.onloadend = function(){
      previewImageSource = reader.result;
    };
    reader.readAsDataURL(blob);
    
    this.previewSrc = previewImageSource;

    console.log(this.previewSrc)

    //reader.readAsDataURL(croppedImg);
    //this.previewSrc = dataUrl this will allow the image to be previewable
    // let buf = new Buffer(croppedImg, 'base64');
  }

  previewImageFile(event) {
    this.file = event.target.files[0];
    const reader  = new FileReader();
    const self = this;

    reader.addEventListener('load', function () {
      self.previewSrc = reader.result;
      if (self.previewSrc !== '../assets/image.png') {
        self.uploadImage = true;
      }
    }, false);

    if (this.file) {
      reader.readAsDataURL(this.file);
    }
  }

  removeImageFile() {
    this.previewSrc = '../assets/image.png';
    this.file = undefined;
    this.uploadImage = false;
  }

}
