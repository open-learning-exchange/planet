import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './meetups-add.component.html'
})
export class MeetupsAddComponent implements OnInit {
  obj = [];
  meetupForm: FormGroup;
  readonly dbName = 'meetups'; // database name constant
  displayMeetupComponent = false;
  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  model = { title: '', description: '' };

  createForm() {
    this.meetupForm = this.fb.group({
      title: [ '', Validators.required ],
      description: [ '', Validators.required ]
    });
  }

  onSubmit() {
    if (this.meetupForm.valid) {
      this.addMeetup(this.meetupForm.value);
    } else {
      Object.keys(this.meetupForm.controls).forEach(field => {
        const control = this.meetupForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addMeetup(meetupInfo) {
    this.couchService.post(this.dbName, { ...meetupInfo }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup created');
    }, (err) => {
      console.log(err);
    });
  }

  cancel() {
    this.router.navigate([ '/meetups' ]);
  }

  ngOnInit() {
    if (this.userService.get().roles.length > 0  || this.userService.get().isUserAdmin) {
      this.displayMeetupComponent = true;
    } else {
      this.planetMessageService.showMessage('Access restricted to admins');
    }
  }

}
