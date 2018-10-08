import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import * as constants from './resources-constants';
import * as JSZip from 'jszip/dist/jszip.min';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { debug } from '../debug-operator';

import Mime from 'mime/Mime';
const mime = new Mime(require('mime/types/standard.json'));

@Component({
  templateUrl: './resources-add.component.html'
})

export class ResourcesAddComponent implements OnInit {
  constants = constants;
  currentDate = new Date();
  file: any;
  existingResource: any = {};
  deleteAttachment = false;
  resourceForm: FormGroup;
  readonly dbName = 'resources'; // make database name a constant
  userDetail: any = {};
  pageType = 'Add new';
  disableDownload = true;
  resourceFilename = '';
  noDescription: boolean;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private route: ActivatedRoute
  ) {
    // Adds the dropdown lists to this component
    Object.assign(this, constants);
    this.createForm();
    this.resourceForm.setValidators(() => {
      if (this.file && this.file.size / 1024 / 1024 > 512) {
        return { 'fileTooBig': true };
      } else {
        return null;
      }
    });
  }

  ngOnInit() {
    this.userDetail = this.userService.get();
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('resources/' + this.route.snapshot.paramMap.get('id'))
        .subscribe((data) => {
          this.pageType = 'Update';
          this.existingResource = data;
          // If the resource does not have an attachment, disable file downloadable toggle
          this.disableDownload = !this.existingResource._attachments;
          this.resourceFilename = this.existingResource._attachments ? Object.keys(this.existingResource._attachments)[0] : '';
          this.resourceForm.patchValue(data);
        }, (error) => {
          console.log(error);
        });
    }
  }

  createForm() {
    this.resourceForm = this.fb.group({
      title: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
          ? ac => this.validatorService.isNameAvailible$(this.dbName, 'title', ac, this.route.snapshot.params.id)
          : ac => this.validatorService.isUnique$(this.dbName, 'title', ac)
      ],
      author: '',
      year: '',
      description: [ '', Validators.required ],
      tags: [ [] ],
      language: '',
      publisher: '',
      linkToLicense: '',
      subject: [ '', Validators.required ],
      level: [ '', Validators.required ],
      openWith: '',
      resourceFor: [],
      medium: '',
      resourceType: '',
      addedBy: '',
      openUrl: [],
      openWhichFile: '',
      isDownloadable: '',
      sourcePlanet: this.userService.getConfig().code,
      resideOn: this.userService.getConfig().code,
      createdDate: Date.now(),
      updatedDate: Date.now()
    });
  }

  // Function which takes a MIME Type as a string and returns whether the file is an
  // image, audio file, video, pdf, or zip.  If none of those five returns 'other'
  private simpleMediaType(mimeType: string) {
    const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
    return mediaTypes.find((type) => mimeType.indexOf(type) > -1) || 'other';
  }

  private singleAttachment(file, mediaType) {
    const resource = {
      filename: file.name,
      mediaType: mediaType,
      _attachments: {}
    };
    return of({ resource, file });
  }

  onSubmit() {
    const descriptionValue = String(this.resourceForm.get('description').value);
    // when description is empty or only contains empty spaces, noDescription is true
    const onlySpace = /^\s*$/.test(descriptionValue) === true;
    const emptySpec = this.resourceForm.get('description').valid !== true;
    (onlySpace) || (emptySpec) ? this.noDescription = true :  this.noDescription = false;
    if (this.resourceForm.valid) {
      const fileObs: Observable<any> = this.createFileObs();
      fileObs.pipe(debug('Preparing file for upload')).subscribe(({ resource, file }) => {
        const { _id, _rev } = this.existingResource;
        // If we are removing the attachment, only keep id and rev from existing resource.  Otherwise use all props
        const existingData = this.deleteAttachment ? { _id, _rev } : this.existingResource;
        // Start with empty object so this.resourceForm.value does not change
        const newResource = Object.assign({}, existingData, this.resourceForm.value, resource);
        const obs = this.pageType === 'Update' ? this.updateResource(newResource) : this.addResource(newResource);
        const message = this.pageType === 'Update' ? 'Resource Updated Successfully' : 'New Resource Created';
        obs.pipe(switchMap((res) => {
          if (file) {
            const opts = { headers: { 'Content-Type': file.type } };
            return this.couchService.putAttachment(this.dbName + '/' + res.id + '/' + file.name + '?rev=' + res.rev, file, opts);
          }
          return of({});
        })).subscribe(() => {
          this.router.navigate([ '/resources' ]);
          this.planetMessageService.showMessage(message);
        }, (err) => this.planetMessageService.showAlert('There was an error with this resource'));
      });
    } else {
      Object.keys(this.resourceForm.controls).forEach(field => {
        const control = this.resourceForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  createFileObs() {
    // If file doesn't exist, mediaType will be undefined
    const mediaType = this.file && this.simpleMediaType(this.file.type);
    switch (mediaType) {
      case undefined:
        // Creates an observable that immediately returns an empty object
        return of({ resource: {} });
      case 'zip':
        return this.zipObs(this.file);
      default:
        return this.singleAttachment(this.file, mediaType);
    }
  }

  addResource(resourceInfo) {
    // ...is the rest syntax for object destructuring
    return this.couchService.post(this.dbName, { ...resourceInfo });
  }

  updateResource(resourceInfo) {
    return this.couchService.put(this.dbName + '/' + resourceInfo._id, { ...resourceInfo, updatedDate: Date.now() });
  }

  deleteAttachmentToggle(event) {
    this.deleteAttachment = event.checked;
    // Also disable downloadable toggle if user is removing file
    this.disableDownload = event.checked;
    this.resourceForm.patchValue({ isDownloadable: false });
  }

  // Returns a function which takes a file name located in the zip file and returns an observer
  // which resolves with the file's data
  private processZip(zipFile) {
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
        forkJoin(fileNames.map(this.processZip(zip))).pipe(debug('Unpacking zip file')).subscribe((filesArray) => {
          // Create object in format for multiple attachment upload to CouchDB
          const filesObj = filesArray.reduce((newFilesObj: any, file: any) => {
            // Default to text/plain if no mime type found
            const fileType = mime.getType(file.name) || 'text/plain';
            newFilesObj[file.name] = { data: file.data, content_type: fileType };
            return newFilesObj;
          }, {});
          // Leave filename blank (since it is many files) and call mediaType 'HTML'
          observer.next({ resource: { filename: '', mediaType: 'HTML', _attachments: filesObj } });
          observer.complete();
        }, (error) => {
          console.log(error);
          observer.error(error);
        });
      });
    });
  }

  cancel() {
    this.router.navigate([ '/resources' ]);
  }

  bindFile(event) {
    this.file = event.target.files[0];
    this.disableDownload = false;
    this.resourceForm.updateValueAndValidity();
  }

}
