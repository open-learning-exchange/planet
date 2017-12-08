import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { ResourceValidatorService } from '../validators/resource-validator.service';
import * as constants from 'constants';
import JSZip from 'jszip';

import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './resources-add.component.html'
})

export class ResourcesAddComponent implements OnInit {
  name = '';
  message = '';
  subjects = new FormControl();
  subjectList = [ 'Agriculture', 'Arts', 'Business and Finance',
  'Environment', 'Food and Nutrition', 'Geography', 'Health and Medicine',
  'History', 'Human Development', 'Languages', 'Law', 'Learning',
  'Literature', 'Math', 'Music', 'Politics and Government', 'Reference',
  'Religion', 'Science', 'Social Sciences', 'Sports', 'Technology' ];
  levels = new FormControl();
  levelList = [ 'Early Education', 'Lower Primary', 'Upper Primary',
  'Lower Secondary', 'Upper Secondary', 'Undergraduate', 'Graduate', 'Professional' ];
  mediums = [ 'Text', 'Graphic/Pictures', 'Audio/Music/Book', 'Video' ];
  openWith = [ 'Just download', 'HTML', 'PDF.js', 'Bell-Reader', 'MP3', 'Flow Video Player', 'BeLL Video Book Player', 'Native Video' ];
  resourceType = [ 'Textbook', 'Lesson Plan', 'Activities', 'Exercises', 'Discussion Questions' ];
  todaydate = new Date();
  file: any;
  mediaType: any;
  resourceForm: FormGroup;
  readonly dbName = 'resources'; // make database name a constant

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private resourceValidatorService: ResourceValidatorService,
    private userService: UserService
  ) {
    this.createForm();
  }

  createForm() {
    this.resourceForm = this.fb.group({
      title: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.resourceValidatorService.checkResourceExists$(ac)
      ],
      author: '',
      year: '',
      language: '',
      publisher: '',
      linkToLicense: '',
      subject: [ '', Validators.required ],
      level: [ '', Validators.required ],
      openWith: '',
      resourceFor: [],
      medium: '',
      articleDate: '',
      resourceType: '',
      addedBy: '',
      openUrl: [],
      openWhichFile: ''
    });
  }

  // Function which takes a MIME Type as a string and returns whether the file is an
  // image, audio file, video, pdf, or zip.  If none of those five returns 'other'
  private simpleMediaType (mimeType: string) {
    const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
    return mediaTypes.find((type) => mimeType.indexOf(type) > -1) || 'other';
  }

  // Creates an observer which reads one file then outputs its data
  private fileReaderObs (file, mediaType) {
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
        const resource = {
          filename: file.name,
          _attachments: attachments,
          mediaType: mediaType
        };
        observer.next(resource);
        observer.complete();
      };
    });
    reader.readAsDataURL(file);
    return obs;
  }

  onSubmit() {
    if (this.resourceForm.valid) {
      let fileObs: Observable<any>;
      if (this.file !== undefined) {
        const mediaType = this.simpleMediaType(this.file.type);
        fileObs = this.fileReaderObs(this.file, mediaType);
      } else {
        // Creates an observable that immediately returns an empty object
        fileObs = of({});
      }
      fileObs.subscribe((resource) => {
        this.addResource(Object.assign(this.resourceForm.value, resource));
      });
    } else {
      Object.keys(this.resourceForm.controls).forEach(field => {
        const control = this.resourceForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  async addResource(resourceInfo) {
    // ...is the rest syntax for object destructuring
    try {
      await this.couchService.post(this.dbName, { ...resourceInfo });
      this.router.navigate([ '/resources' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  zipAttachment() {
    const zip = new JSZip();
    // This loads an object with file information from the zip, but not the data of the files
    const that = this;
    const preProcessZip = function(zipFile) {
      return function(fileName) {
        return new Promise(function(resolve, reject) {
          // When file was not read error block wasn't called from async so added try...catch block
          try {
              zipFile.file(fileName).async('base64').then(function success(data) {
                  resolve({ name: fileName, data: data });
              }, function error(e) {
                  reject(e);
              });
          } catch (e) {
              console.log(fileName + ' has caused error.');
              reject(e);
          }
        });
      };
    };
    const mime = require('mime-types');
    zip.loadAsync(this.file).then(function(data) {
      const fileNames = [];
      // Add file names to array for mapping
      for (const path in data.files) {
          if (!data.files[path].dir && path.indexOf('DS_Store') === -1) {
              fileNames.push(path);
          }
      }
      // Since files are loaded async, use Promise all to ensure all data from the files are loaded before attempting upload
      Promise.all(fileNames.map(preProcessZip(zip))).then(function(filesArray) {
        // Create object in format for multiple attachment upload to CouchDB
        const filesObj = filesArray.reduce(function(filesObj, file) {
            filesObj[file['name']] = { data: file['data'], content_type: mime.contentType(file['name']) };
            return filesObj;
        }, { });
        that.addResource(Object.assign(that.resourceForm.value, { filename: that.file.name, mediaType: 'zip', _attachments: filesObj }));
      }, function(error) {
          console.log(error);
      });
    });
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
  }

  cancel() {
    this.location.back();
  }

  bindFile(event) {
    this.file = event.target.files[0];
  }

}
