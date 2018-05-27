import { Component, OnInit } from '@angular/core';
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

@Component({
  templateUrl: './meetups-add.component.html'
})

export class MeetupsAddComponent implements OnInit {
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
    private userService: UserService
  ) {
    this.createForm();
  }

  ngOnInit() {
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('meetups/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.revision = data._rev;
        this.id = data._id;
        this.meetupFrequency = data.recurring === 'daily' ? [] : data.day;
        this.meetupForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
    }
  }

  createForm() {
    this.meetupForm = this.fb.group({
      title: [ '', Validators.required ],
      description: [ '', Validators.required ],
      startDate: [ '',
      Validators.compose([
        CustomValidators.dateValidator,
        CustomValidators.notDateInPast
        ])
      ],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator
        ])
      ],
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
      createdDate: Date.now()
    });
  }

  onSubmit() {
    if (this.meetupForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateMeetup(this.meetupForm.value);
      } else {
        this.addMeetup(this.meetupForm.value);
      }
    } else {
      Object.keys(this.meetupForm.controls).forEach(field => {
        const control = this.meetupForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  updateMeetup(meetupeInfo) {
    this.couchService.put(this.dbName + '/' + this.id, { ...meetupeInfo, '_rev': this.revision }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addMeetup(meetupInfo) {
    this.couchService.post(this.dbName, { ...meetupInfo }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup created');
    }, (err) => console.log(err));
  }

  cancel() {
    this.router.navigate([ '/meetups' ]);
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
    switch (val)  {
      case 'daily':
        // add all days to the array if the course is daily
        this.meetupForm.setControl('day', this.fb.array(this.days));
        break;
      case 'weekly':
        this.meetupForm.setControl('day', this.fb.array(this.meetupFrequency));
        break;
    }
  }

}
