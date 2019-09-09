import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import * as constants from '../constants';
import { CustomValidators } from '../../validators/custom-validators';
import { UserService } from '../../shared/user.service';
import { switchMap } from 'rxjs/operators';
import { findDocuments } from '../../shared/mangoQueries';
import { ValidatorService } from '../../validators/validator.service';

@Component({
  selector: 'planet-meetups-add',
  templateUrl: './meetups-add.component.html',
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
export class MeetupsAddComponent implements OnInit {

  @Input() link: any = {};
  @Input() isDialog = false;
  @Output() onGoBack = new EventEmitter<any>();
  message = '';
  meetupForm: FormGroup;
  readonly dbName = 'meetups'; // database name constant
  categories = constants.categories;
  pageType = 'Add new';
  revision = null;
  id = null;
  days = constants.days;
  meetupFrequency = [];

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private userService: UserService,
    private validatorService: ValidatorService
  ) {
    this.createForm();
  }

  ngOnInit() {
    if (!this.isDialog && this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('meetups/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.revision = data._rev;
        this.id = data._id;
        this.meetupFrequency = data.recurring === 'daily' ? [] : data.day;
        data.startDate = new Date(data.startDate);
        data.endDate = data.endDate ? new Date(data.endDate) : '';
        this.meetupForm.patchValue(data);
        this.meetupForm.controls.day.patchValue(data.day);
      }, (error) => {
        console.log(error);
      });
    }
  }

  createForm() {
    this.meetupForm = this.fb.group({
      title: [
        '',
        CustomValidators.required,
        ac => this.validatorService.isUnique$(this.dbName, 'title', ac, { selectors: { '_id': { $ne: this.id } } })
      ],
      description: [ '', CustomValidators.required ],
      startDate: [ '', [], ac => this.validatorService.notDateInPast$(ac) ],
      endDate: [ '', CustomValidators.endDateValidator() ],
      recurring: '',
      day: this.fb.array([]),
      startTime: [ '', CustomValidators.timeValidator ],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator
        ])
      ],
      category: '',
      meetupLocation: '',
      createdBy: this.userService.get().name,
      createdDate: this.couchService.datePlaceholder
    });
  }

  onSubmit() {
    if (!this.meetupForm.valid) {
      Object.keys(this.meetupForm.controls).forEach(field => {
        const control = this.meetupForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
      return;
    }
    const meetup = { ...this.meetupForm.value, link: this.link };
    if (!this.isDialog && this.route.snapshot.url[0].path === 'update') {
      this.updateMeetup(meetup);
    } else {
      this.addMeetup(meetup);
    }
  }

  updateMeetup(meetupInfo) {
    this.couchService.updateDocument(this.dbName, {
      ...meetupInfo,
      '_id': this.id,
      '_rev': this.revision,
      'startDate': Date.parse(meetupInfo.startDate),
      'endDate': Date.parse(meetupInfo.endDate)
     }).pipe(switchMap(() => {
        return this.couchService.post('shelf/_find', findDocuments({
          'meetupIds': { '$in': [ this.id ] }
        }, [ '_id' ], 0));
      }),
      switchMap(data => {
        return this.couchService.updateDocument('notifications/_bulk_docs', this.meetupChangeNotifications(data.docs, meetupInfo, this.id));
      })
    ).subscribe((res) => {
      this.goBack(res);
      this.planetMessageService.showMessage(meetupInfo.title + ' Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addMeetup(meetupInfo) {
    this.couchService.updateDocument(this.dbName, {
      ...meetupInfo,
      'startDate': Date.parse(meetupInfo.startDate),
      'endDate': Date.parse(meetupInfo.endDate),
    }).subscribe((res) => {
      this.goBack(res);
      this.planetMessageService.showMessage(meetupInfo.title + ' Added');
    }, (err) => console.log(err));
  }

  cancel() {
    this.goBack();
  }

  goBack(res?) {
    if (this.isDialog) {
      this.onGoBack.emit(res);
    } else {
      this.router.navigate([ '/meetups' ]);
    }
  }

  isClassDay(day) {
    return this.meetupFrequency.includes(day) ? true : false;
  }

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = <FormArray>this.meetupForm.controls.day;
    if (isChecked) {
      // add to day array if checked
      dayFormArray.push(new FormControl(day));
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(x => x.value === day);
      dayFormArray.removeAt(index);
    }
  }

  toggleDaily(val, showCheckbox) {
    // empty the array
    this.meetupForm.setControl('day', this.fb.array([]));
    switch (val) {
      case 'daily':
        // add all days to the array if the course is daily
        this.meetupForm.setControl('day', this.fb.array(this.days));
        break;
      case 'weekly':
        this.meetupForm.setControl('day', this.fb.array(this.meetupFrequency));
        break;
    }
  }

  meetupChangeNotifications(users, meetupInfo, meetupId) {
    return { docs: users.map((user) => ({
      'user': user._id,
      'message': `<b>"${meetupInfo.title}"</b> has been updated.`,
      'link': '/meetups/view/' + meetupId,
      'item': meetupId,
      'type': 'meetup',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    })) };
  }

}
