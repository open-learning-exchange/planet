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
import { showFormErrors } from '../../shared/table-helpers';
import { StateService } from '../../shared/state.service';

@Component({
  selector: 'planet-meetups-add',
  templateUrl: './meetups-add.component.html',
  styles: [ `
    form.form-spacing {
      width: inherit;
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
  @Input() meetup: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
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
    private stateService: StateService
  ) {
    this.createForm();
   }

   ngOnInit() {
    if (this.meetup._id) {
      this.setMeetupData({ ...this.meetup });
    } else if (this.meetup.startDate && this.meetup.endDate) {
      // Use default dates if provided in the input
      this.createForm(this.meetup.startDate, this.meetup.endDate);
    } else {
      // Create form without defaults if not provided
      this.createForm();
    }
  }

  setMeetupData(meetup: any) {
    this.pageType = 'Update';
    this.revision = meetup._rev;
    this.id = meetup._id;
    this.meetupFrequency = meetup.recurring === 'daily' ? [] : meetup.day;
    meetup.startDate = new Date(meetup.startDate);
    meetup.endDate = meetup.endDate ? new Date(meetup.endDate) : '';
    this.meetupForm.patchValue(meetup);
    meetup.day.forEach(day => (<FormArray>this.meetupForm.controls.day).push(new FormControl(day)));
  }

  createForm(startDate: Date = null, endDate: Date = null) {
    this.meetupForm = this.fb.group({
      title: ['', CustomValidators.required],
      description: ['', CustomValidators.required],
      startDate: [startDate, [CustomValidators.required, CustomValidators.startDateValidator()]], // Set startDate
      endDate: [endDate, CustomValidators.endDateValidator()], // Set endDate
      recurring: 'none',
      day: this.fb.array([]),
      startTime: ['', CustomValidators.timeValidator()],
      endTime: ['', CustomValidators.timeValidator()],
      category: '',
      meetupLocation: '',
      createdBy: this.userService.get().name,
      sourcePlanet: this.stateService.configuration.code,
      createdDate: this.couchService.datePlaceholder,
      recurringNumber: [10, [Validators.min(2), CustomValidators.integerValidator]]
    }, {
      validators: CustomValidators.meetupTimeValidator()
    });
  }

  onSubmit() {
    if (!this.meetupForm.valid) {
      showFormErrors(this.meetupForm.controls);
      return;
    }
    this.meetupForm.value.startTime = this.changeTimeFormat(this.meetupForm.value.startTime);
    this.meetupForm.value.endTime = this.changeTimeFormat(this.meetupForm.value.endTime);
    const meetup = { ...this.meetupForm.value, link: this.link, sync: this.sync };
    if (this.pageType === 'Update') {
      this.updateMeetup(meetup);
    } else {
      this.addMeetup(meetup);
    }
  }

  changeTimeFormat(time: string): string {
    if (time && time.length < 5) {
      return '0' + time;
    }
    return time;
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
      this.planetMessageService.showMessage($localize`${meetupInfo.title} Updated Successfully`);
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
      this.planetMessageService.showMessage($localize`${meetupInfo.title} Added`);
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
      'message': $localize`<b>"${meetupInfo.title}"</b> has been updated.`,
      'link': '/meetups/view/' + meetupId,
      'item': meetupId,
      'type': 'meetup',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    })) };
  }
}
