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
import * as constants from './resources-constants';

import * as JSZip from 'jszip';
import * as mime from 'mime-types';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
  templateUrl: './resources-add.component.html'
})
export class ResourcesAddComponent implements OnInit {
  name = '';
  subjects = new FormControl();
  levels = new FormControl();
  subjectList: string[];
  levelList: string[];
  media: string[];
  openWith: string[];
  resourceType: string[];
  currentDate = new Date();
  file: any;
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
    // Adds the dropdown lists to this component
    Object.assign(this, constants);
    this.createForm();
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
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
      // If file doesn't exist, mediaType will be undefined
      const mediaType = this.file && this.simpleMediaType(this.file.type);
      switch (mediaType) {
        case undefined:
          // Creates an observable that immediately returns an empty object
          fileObs = of({});
          break;
        case 'zip':
          fileObs = this.zipObs(this.file);
          break;
        default:
          fileObs = this.fileReaderObs(this.file, mediaType);
      }
      fileObs.subscribe((resource) => {
        // Start with empty object so this.resourceForm.value does not change
        this.addResource(Object.assign({}, this.resourceForm.value, resource));
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

  // Returns a function which takes a file name located in the zip file and returns an observer
  // which resolves with the file's data
  private processZip (zipFile) {
    return function(fileName) {
      return Observable.create((observer) => {
        // When file was not read error block wasn't called from async so added try...catch block
        try {
          zipFile.file(fileName).async('base64').then(function success(data) {
            observer.next({ name: fileName, data: data });
            observer.complete();
          }, function error(e) {
            observer.error(e);
          });
        } catch (e) {
          console.log(fileName + ' has caused error.');
          observer.error(e);
        }
      });
    };
  }

  zipObs(zipFile) {
    const zip = new JSZip();
    return Observable.create((observer) => {
      // This loads an object with file information from the zip, but not the data of the files
      zip.loadAsync(zipFile).then((data) => {
        const fileNames = [];
        // Add file names to array for mapping
        for (const path in data.files) {
          if (!data.files[path].dir && path.indexOf('DS_Store') === -1) {
            fileNames.push(path);
          }
        }
        // Since files are loaded async, use forkJoin Observer to ensure all data from the files are loaded before attempting upload
        forkJoin(fileNames.map(this.processZip(zip))).subscribe((filesArray) => {
          // Create object in format for multiple attachment upload to CouchDB
          const filesObj = filesArray.reduce((newFilesObj: any, file: any) => {
            // Default to text/plain if no mime type found
            const fileType = mime.lookup(file.name) || 'text/plain';
            newFilesObj[file.name] = { data: file.data, content_type: fileType };
            return newFilesObj;
          }, {});
          // Leave filename blank (since it is many files) and call mediaType 'HTML'
          observer.next({ filename: '', mediaType: 'HTML', _attachments: filesObj });
          observer.complete();
        }, (error) => {
          console.log(error);
          observer.error(error);
        });
      });
    });
  }

  cancel() {
    this.location.back();
  }

  bindFile(event) {
    this.file = event.target.files[0];
  }

}
