import { Component, OnInit, Input, EventEmitter, Output, HostListener } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, of, race } from 'rxjs';
import { debounce, switchMap } from 'rxjs/operators';
import * as constants from '../constants';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CustomValidators } from '../../validators/custom-validators';
import { UserService } from '../../shared/user.service';
import { findDocuments } from '../../shared/mangoQueries';
import { showFormErrors } from '../../shared/table-helpers';
import { StateService } from '../../shared/state.service';
import { CanComponentDeactivate } from '../../shared/unsaved-changes.guard';
import { warningMsg } from '../../shared/unsaved-changes.component';

type DatePlaceholder = CouchService['datePlaceholder'];

interface MeetupFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  startDate: FormControl<string | Date | null>;
  endDate: FormControl<string | Date | null>;
  recurring: FormControl<string>;
  day: FormArray<FormControl<string>>;
  startTime: FormControl<string>;
  endTime: FormControl<string>;
  category: FormControl<string>;
  meetupLocation: FormControl<string>;
  meetupLink: FormControl<string>;
  createdBy: FormControl<string>;
  sourcePlanet: FormControl<string>;
  createdDate: FormControl<number | DatePlaceholder>;
  recurringNumber: FormControl<number | null>;
}

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
export class MeetupsAddComponent implements OnInit, CanComponentDeactivate {

  @Input() link: any = {};
  @Input() isDialog = false;
  @Input() meetup: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Output() onGoBack = new EventEmitter<any>();
  message = '';
  meetupForm: FormGroup<MeetupFormControls>;
  readonly dbName = 'meetups'; // database name constant
  categories = constants.categories;
  pageType = 'Add new';
  revision = null;
  id = null;
  days = constants.days;
  meetupFrequency: string[] = [];
  initialFormValues = '';
  hasUnsavedChanges = false;
  userTimezone = '';
  selectedTimezone = 'America/New_York';
  get dayFormArray(): FormArray<FormControl<string>> {
    return this.meetupForm.controls.day as FormArray<FormControl<string>>;
  }

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: NonNullableFormBuilder,
    private userService: UserService,
    private stateService: StateService
  ) {
    this.createForm();
  }

  ngOnInit() {
    // Use a standard timezone for display (American standard)
    this.userTimezone = this.selectedTimezone = 'America/New_York';
    if (this.meetup._id) {
      this.setMeetupData({ ...this.meetup });
    } else {
      this.createForm();
    }
    if (!this.isDialog && this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('meetups/' + this.route.snapshot.paramMap.get('id')).subscribe(
        data => {
          this.setMeetupData(data);
          this.captureInitialState();
          this.onFormChanges();
        },
        error => console.log(error)
      );
    } else {
      this.captureInitialState();
      this.onFormChanges();
    }
  }

  private parseDateValue(value: string | Date | null): number {
    if (!value) {return NaN;}
    if (value instanceof Date) {return value.getTime();}
    return Date.parse(value);
  }

  setMeetupData(meetup: any) {
    this.pageType = 'Update';
    this.revision = meetup._rev;
    this.id = meetup._id;
    const dayValues: string[] = Array.isArray(meetup.day) ? meetup.day : [];
    this.meetupFrequency = meetup.recurring === 'daily' ? [] : dayValues;
    meetup.startDate = meetup.startDate ? new Date(meetup.startDate) : null;
    meetup.endDate = meetup.endDate ? new Date(meetup.endDate) : null;
    this.meetupForm.patchValue(meetup);
    this.dayFormArray.clear();
    dayValues.forEach(day => this.dayFormArray.push(this.fb.control(day)));
  }

  private captureInitialState() {
    const formValue = this.meetupForm.getRawValue();
    this.initialFormValues = JSON.stringify({
      ...formValue,
      startDate: formValue.startDate ? this.parseDateValue(formValue.startDate) : null,
      endDate: formValue.endDate ? this.parseDateValue(formValue.endDate) : null,
      day: formValue.day || []
    });
  }

  onFormChanges() {
    this.meetupForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(formValue => {
        const currentState = JSON.stringify({
          ...formValue,
          startDate: formValue.startDate ? this.parseDateValue(formValue.startDate) : null,
          endDate: formValue.endDate ? this.parseDateValue(formValue.endDate) : null,
          day: formValue.day || []
        });
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });
  }

  createForm() {
    this.meetupForm = this.fb.group<MeetupFormControls>({
      title: this.fb.control('', { validators: [ CustomValidators.required ] }),
      description: this.fb.control('', { validators: [ CustomValidators.required ] }),
      startDate: this.fb.control<string | Date | null>(this.meetup?.startDate ?? '', {
        validators: [ Validators.required ]
      }),
      endDate: this.fb.control<string | Date | null>(this.meetup?.endDate ?? '', {
        validators: [ CustomValidators.endDateValidator() ]
      }),
      recurring: this.fb.control('none'),
      day: this.fb.array<FormControl<string>>([]),
      startTime: this.fb.control('', { validators: [ CustomValidators.timeValidator() ] }),
      endTime: this.fb.control('', { validators: [ CustomValidators.timeValidator() ] }),
      category: this.fb.control(''),
      meetupLocation: this.fb.control(''),
      meetupLink: this.fb.control('', { asyncValidators: [ CustomValidators.validLink ] }),
      createdBy: this.fb.control(this.userService.get().name),
      sourcePlanet: this.fb.control(this.stateService.configuration.code),
      createdDate: this.fb.control<number | DatePlaceholder>(this.couchService.datePlaceholder),
      recurringNumber: this.fb.control<number | null>(10, {
        validators: [ Validators.min(2), CustomValidators.integerValidator ]
      })
    }, {
      validators: CustomValidators.meetupTimeValidator()
    });
  }

  onSubmit() {
    if (this.meetupForm.invalid) {
      showFormErrors(this.meetupForm.controls);
      return;
    }
    const dayFormArray = this.dayFormArray;
    dayFormArray.updateValueAndValidity();
    const meetupValue = this.meetupForm.getRawValue();
    const meetup = {
      ...meetupValue,
      startTime: this.changeTimeFormat(meetupValue.startTime),
      endTime: this.changeTimeFormat(meetupValue.endTime),
      link: this.link,
      sync: this.sync
    };
    if (this.pageType === 'Update') {
      this.updateMeetup(meetup);
    } else {
      this.addMeetup(meetup);
    }
    this.hasUnsavedChanges = false;
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
      'startDate': this.parseDateValue(meetupInfo.startDate),
      'endDate': this.parseDateValue(meetupInfo.endDate)
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
      this.planetMessageService.showMessage($localize`Edited event: ${meetupInfo.title}`);
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addMeetup(meetupInfo) {
    this.couchService.updateDocument(this.dbName, {
      ...meetupInfo,
      'startDate': this.parseDateValue(meetupInfo.startDate),
      'endDate': this.parseDateValue(meetupInfo.endDate),
    }).subscribe((res) => {
      this.goBack(res);
      this.planetMessageService.showMessage($localize` Added event: ${meetupInfo.title}`);
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

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = this.dayFormArray;
    if (isChecked) {
      // add to day array if checked
      dayFormArray.push(this.fb.control(day));
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(control => control.value === day);
      if (index >= 0) {
        dayFormArray.removeAt(index);
      }
    }
    dayFormArray.updateValueAndValidity();
  }

  // timezone is fixed to America/New_York

  toggleDaily(val: string, showCheckbox: boolean) {
    const dayFormArray = this.dayFormArray;
    dayFormArray.clear();
    dayFormArray.clearValidators();

    switch (val) {
      // add all days to the array if the course is daily
      case 'daily':
        this.days.forEach((day) => {
          dayFormArray.push(this.fb.control(day));
        });
        break;
      case 'weekly':
        dayFormArray.setValidators(CustomValidators.atLeastOneDaySelected());
        const startDateValue = this.meetupForm.controls.startDate.value;
        if (startDateValue) {
          const startDateObj = startDateValue instanceof Date ? startDateValue : new Date(startDateValue);
          const dayOfWeek = this.days[startDateObj.getDay()];
          if (dayOfWeek) {
            dayFormArray.push(this.fb.control(dayOfWeek));
          }
        }
        break;

      default:
        break;
    }
    dayFormArray.updateValueAndValidity();
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
