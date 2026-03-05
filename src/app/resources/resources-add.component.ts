import { Component, OnInit, Input, Output, EventEmitter, HostListener, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, of, forkJoin, combineLatest, race, interval } from 'rxjs';
import { switchMap, first, debounce, map, startWith } from 'rxjs/operators';
import mime from 'mime';
import * as JSZip from 'jszip/dist/jszip.min';
import * as constants from './resources-constants';
import { FileInputComponent } from '../shared/forms/file-input.component';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
import { languages } from '../shared/languages';
import { ResourcesService } from './resources.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { showFormErrors } from '../shared/table-helpers';
import { deepEqual } from '../shared/utils';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';

type DatePlaceholderType = CouchService['datePlaceholder'];

interface ResourceFormModel {
  title: FormControl<string>;
  author: FormControl<string>;
  year: FormControl<string>;
  description: FormControl<string>;
  language: FormControl<string>;
  publisher: FormControl<string>;
  linkToLicense: FormControl<string>;
  subject: FormControl<string[]>;
  level: FormControl<string[]>;
  openWith: FormControl<string>;
  resourceFor: FormControl<string[]>;
  medium: FormControl<string>;
  resourceType: FormControl<string>;
  addedBy: FormControl<string>;
  openWhichFile: FormControl<string>;
  isDownloadable: FormControl<boolean>;
  sourcePlanet: FormControl<string>;
  resideOn: FormControl<string>;
  createdDate: FormControl<number | DatePlaceholderType>;
  updatedDate: FormControl<number | DatePlaceholderType>;
  private: FormControl<boolean>;
}

@Component({
  selector: 'planet-resources-add',
  templateUrl: './resources-add.component.html',
  styleUrls: [ './resources-add.scss' ]
})

export class ResourcesAddComponent implements OnInit, CanComponentDeactivate {
  constants = constants;
  file: any;
  attachedZipFiles: string[] = [];
  filteredZipFiles: Observable<string[]>;
  deleteAttachment = false;
  resourceForm!: FormGroup<ResourceFormModel>;
  readonly dbName = 'resources'; // make database name a constant
  currentUsername = '';
  pageType: string | null = null;
  showDownloadCheckbox = false;
  disableDelete = true;
  resourceFilename = '';
  languages = languages;
  tags = this.fb.control<string[]>([]);
  _existingResource: any = {};
  get existingResource(): any {
    return this._existingResource;
  }
  @Input() set existingResource(resource) {
    this._existingResource = resource;
    if (this.resourceForm) {
      this.setFormValues(resource);
    }
  }
  @Input() isDialog = false;
  @Input() privateFor: any;
  @Output() afterSubmit = new EventEmitter<any>();
  attachmentMarkedForDeletion = false;
  hasUnsavedChanges = false;
  private initialState = '';
  @ViewChild('fileInput') fileInput!: FileInputComponent;

  constructor(
    private router: Router,
    private fb: NonNullableFormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private resourcesService: ResourcesService,
    private dialogsLoadingService: DialogsLoadingService,
  ) {
    // Adds the dropdown lists to this component
    Object.assign(this, constants);
  }

  ngOnInit() {
    this.currentUsername = this.userService.get().name;
    this.createForm();
    this.resourceForm.setValidators(() => {
      if (this.file && this.file.size / 1024 / 1024 > 512) {
        return { 'fileTooBig': true };
      } else {
        return null;
      }
    });
    this.resourcesService.requestResourcesUpdate(false, false);
    if (!this.isDialog && this.route.snapshot.url[0].path === 'update') {
      this.resourcesService.resourcesListener(false).pipe(first())
        .subscribe((resources: any[]) => {
          this.pageType = 'Edit';
          const resource = resources.find(r => r._id === this.route.snapshot.paramMap.get('id'));
          this.existingResource = resource;
        }, (error) => {
          console.log(error);
        });
    } else {
      this.pageType = 'Add';
    }

    this.filteredZipFiles = this.resourceForm.controls.openWhichFile.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value))
      );
    this.onFormChanges();
    this.captureInitialState();
  }

  createForm() {
    this.resourceForm = this.fb.group<ResourceFormModel>({
      title: this.fb.control('', {
        validators: CustomValidators.required,
        asyncValidators: [
          // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
          (ac) => this.validatorService.checkUniqueResourceTitle$(ac, this.existingResource._id, this.privateFor)
        ]
      }),
      author: this.fb.control(''),
      year: this.fb.control(''),
      description: this.fb.control('', { validators: CustomValidators.required }),
      language: this.fb.control(''),
      publisher: this.fb.control(''),
      linkToLicense: this.fb.control(''),
      subject: this.fb.control<string[]>([], { validators: Validators.required }),
      level: this.fb.control<string[]>([], { validators: Validators.required }),
      openWith: this.fb.control(''),
      resourceFor: this.fb.control<string[]>([]),
      medium: this.fb.control(''),
      resourceType: this.fb.control(''),
      addedBy: this.fb.control(this.currentUsername),
      openWhichFile: this.fb.control({ value: '', disabled: true }, {
        validators: (ac) => CustomValidators.fileMatch(ac, this.attachedZipFiles)
      }),
      isDownloadable: this.fb.control(false),
      sourcePlanet: this.fb.control(this.stateService.configuration.code),
      resideOn: this.fb.control(this.stateService.configuration.code),
      createdDate: this.fb.control<number | DatePlaceholderType>(this.couchService.datePlaceholder),
      updatedDate: this.fb.control<number | DatePlaceholderType>(this.couchService.datePlaceholder),
      private: this.fb.control(this.privateFor !== undefined)
    });
    if (this.existingResource.doc) {
      this.setFormValues(this.existingResource);
    }
  }

  setFormValues(resource: any) {
    this.privateFor = resource.doc.privateFor;
    // If the resource does not have an attachment, disable file downloadable toggle
    this.showDownloadCheckbox = !!resource.doc._attachments;
    this.disableDelete = !resource.doc._attachments;
    this.resourceFilename = resource.doc._attachments
      ? Object.keys(resource.doc._attachments).join(', ')
      : '';
    if (resource.doc._attachments && Object.keys(resource.doc._attachments).length > 1) {
      this.resourceForm.controls.openWhichFile.enable();
      this.attachedZipFiles = Object.keys(resource.doc._attachments);
    }
    const doc = resource.doc || {};
    this.resourceForm.patchValue({
      ...doc,
      title: doc.title ?? '',
      author: doc.author ?? '',
      year: doc.year ?? '',
      description: doc.description ?? '',
      language: doc.language ?? '',
      publisher: doc.publisher ?? '',
      linkToLicense: doc.linkToLicense ?? '',
      subject: doc.subject ?? [],
      level: doc.level ?? [],
      openWith: doc.openWith ?? '',
      resourceFor: doc.resourceFor ?? [],
      medium: doc.medium ?? '',
      resourceType: doc.resourceType ?? '',
      addedBy: doc.addedBy ?? this.currentUsername,
      openWhichFile: doc.openWhichFile ?? '',
      isDownloadable: doc.isDownloadable ?? false,
      sourcePlanet: doc.sourcePlanet ?? this.stateService.configuration.code,
      resideOn: doc.resideOn ?? this.stateService.configuration.code,
      createdDate: doc.createdDate ?? this.couchService.datePlaceholder,
      updatedDate: doc.updatedDate ?? this.couchService.datePlaceholder,
      private: doc.private ?? this.privateFor !== undefined
    });
    this.tags.setValue(resource.tags.map((tag: any) => tag._id));
    this.captureInitialState();
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.attachedZipFiles.filter(option => option.toLowerCase().includes(filterValue));
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
    if (this.attachmentMarkedForDeletion) {
      delete this.existingResource.doc._attachments;
    }
    if (!this.resourceForm.valid) {
      this.dialogsLoadingService.stop();
      showFormErrors(this.resourceForm.controls);
      return;
    }
    const fileObs: Observable<any> = this.createFileObs();
    fileObs.subscribe(({ resource, file }) => {
      const { _id, _rev } = this.existingResource;
      // If we are removing the attachment, only keep id and rev from existing resource.  Otherwise use all props
      const existingData = this.attachmentMarkedForDeletion ? { _id, _rev } : this.existingResource.doc;
      // Start with empty object so this.resourceForm.value does not change
      const newResource = Object.assign({}, existingData, this.resourceForm.value, resource);
      const message = (this.pageType === 'Edit' ? $localize`Edited resource: ` : $localize`Added resource: `) + newResource.title;
      const currentTags = (this.existingResource.tags || []).map(tag => tag._id);
      if (JSON.stringify(existingData) !== JSON.stringify(newResource) || !deepEqual(currentTags, this.tags.value)) {
        this.updateResource(newResource, file).subscribe(
          (resourceRes) => this.afterResourceUpdate(message, resourceRes),
          (err) => this.planetMessageService.showAlert($localize`There was an error with this resource`)
        );
      } else {
        this.afterResourceUpdate(message);
      }
    });
  }

  createFileObs() {
    // If file doesn't exist, mediaType will be undefined or null
    const mediaType = this.file && this.resourcesService.simpleMediaType(this.file.type);
    if (!mediaType) {
      // Creates an observable that immediately returns an empty object
      return of({ resource: {} });
    }
    switch (mediaType) {
      case 'zip':
        return this.zipObs(this.file);
      default:
        return this.singleAttachment(this.file, mediaType);
    }
  }

  updateResource(resourceInfo, file) {
    return this.resourcesService.updateResource(
      { ...resourceInfo, updatedDate: this.couchService.datePlaceholder, privateFor: resourceInfo.private ? this.privateFor : undefined },
      file,
      { newTags: this.tags.value, existingTags: this.existingResource.tags }
    ).pipe(
      switchMap(([ res ]) => forkJoin([
        this.couchService.get(`resources/${res.id}`),
        resourceInfo._rev ? of({}) : this.resourcesService.sendResourceNotification()
      ])),
      switchMap(([ resource, notifications ]) => of(resource))
    );
  }

  afterResourceUpdate(message, resourceRes?) {
    this.hasUnsavedChanges = false;
    this.captureInitialState();

    if (this.isDialog) {
      this.afterSubmit.next({ doc: resourceRes });
    } else {
      this.router.navigate([ '/resources' ]);
    }
    this.planetMessageService.showMessage(message);
  }

  deleteAttachmentToggle(event) {
    this.deleteAttachment = event.checked;
    // Also disable downloadable toggle if user is removing file
    this.showDownloadCheckbox = !event.checked;
    this.resourceForm.patchValue({ isDownloadable: false });
  }

  markAttachmentForDeletion() {
    this.attachmentMarkedForDeletion = true;
    this.resourceFilename = '';
    this.disableDelete = true;
    this.showDownloadCheckbox = false;
    this.resourceForm.patchValue({ isDownloadable: false });
    this.hasUnsavedChanges = true;
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

  private getFileNames(data) {
    // Add file names to array for mapping
    const fileNames = [];
    for (const path in data.files) {
      if (!data.files[path].dir && path.indexOf('DS_Store') === -1) {
        fileNames.push(path);
      }
    }
    return fileNames;
  }

  zipObs(zipFile) {
    const zip = new JSZip();
    return Observable.create((observer) => {
      // This loads an object with file information from the zip, but not the data of the files
      zip.loadAsync(zipFile).then((data) => {
        const fileNames = this.getFileNames(data);

        // Since files are loaded async, use forkJoin Observer to ensure all data from the files are loaded before attempting upload
        forkJoin(fileNames.map(this.processZip(zip))).subscribe((filesArray) => {
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

  removeNewFile() {
    this.file = null;
    this.fileInput.clearFile();
    this.showDownloadCheckbox = !!this.existingResource.doc?._attachments && !this.attachmentMarkedForDeletion;
    this.resourceForm.updateValueAndValidity();
    this.hasUnsavedChanges = true;
  }

  bindFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const disableOpenWhichFile = () => {
      this.resourceForm.controls.openWhichFile.setValue('');
      this.resourceForm.controls.openWhichFile.disable();
      this.attachedZipFiles = [];
    };
    if (!input.files || input.files.length === 0) {
      disableOpenWhichFile();
      return;
    }
    this.file = input.files[0];
    this.showDownloadCheckbox = true;
    this.resourceForm.updateValueAndValidity();

    if (this.resourcesService.simpleMediaType(this.file.type) !== 'zip') {
      disableOpenWhichFile();
      return;
    }

    this.resourceForm.controls.openWhichFile.enable();
    const zip = new JSZip();

    zip.loadAsync(this.file).then((data) => {
      this.attachedZipFiles = this.getFileNames(data);
    },
    err => {
      console.log('error', err.message);
    });
  }

  private getNormalizedState(): any {
    const formValue = this.resourceForm.value;
    return {
      title: formValue.title || '',
      description: formValue.description || '',
      language: formValue.language || '',
      publisher: formValue.publisher || '',
      linkToLicense: formValue.linkToLicense || '',
      subject: formValue.subject || [],
      level: formValue.level || [],
      openWith: formValue.openWith || '',
      resourceFor: formValue.resourceFor || [],
      medium: formValue.medium || '',
      resourceType: formValue.resourceType || '',
      author: formValue.author || '',
      year: formValue.year || '',
      tags: this.tags.value || [],
      attachment: this.file
        ? { name: this.file.name, size: this.file.size, type: this.file.type }
        : null,
      attachmentMarkedForDeletion: this.attachmentMarkedForDeletion
    };
  }

  private captureInitialState() {
    this.initialState = JSON.stringify(this.getNormalizedState());
  }

  onFormChanges() {
    combineLatest([
      this.resourceForm.valueChanges,
      this.tags.valueChanges
    ])
      .pipe(debounce(() => race(interval(200), of(true))))
      .subscribe(() => {
        const currentState = JSON.stringify(this.getNormalizedState());
        this.hasUnsavedChanges = currentState !== this.initialState;
      });
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }
}
