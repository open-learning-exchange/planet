import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
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
      startDate: [ '', Validators.compose([
        CustomValidators.dateValidator,
        Validators.required
        ]) ],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator,
          Validators.required
        ])
      ],
      recurring: 'none',
      startTime: [
        '', Validators.compose([
        CustomValidators.timeValidator,
        Validators.required
        ])
      ],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator,
          Validators.required
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
    this.couchService.put(this.dbName + '/' + this.id, { ...meetupeInfo, '_rev': this.revision,
     'startDate': this.getTimestamp(meetupeInfo.startDate), 'endDate': this.getTimestamp(meetupeInfo.endDate) }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addMeetup(meetupInfo) {
    this.couchService.post(this.dbName, { ...meetupInfo, 'startDate': this.getTimestamp(meetupInfo.startDate),
     'endDate': this.getTimestamp(meetupInfo.endDate) }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup created');
    }, (err) => console.log(err));
  }

  cancel() {
    this.router.navigate([ '/meetups' ]);
  }

  getTimestamp(date) {
    const myDate = date.split('-');
    return new Date(Date.UTC(myDate[0], myDate[1] - 1, myDate[2])).getTime();
  }

}
