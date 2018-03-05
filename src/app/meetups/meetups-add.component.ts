import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  templateUrl: './meetups-add.component.html',
  styles: [ `
  /* Consider using space-container app wide for route views */
  .space-container {
    margin: 64px 30px;
    background: none;
  }
  .view-container {
    background-color: #FFFFFF;
    padding: 1rem;
  }
` ]
})
export class MeetupsAddComponent {
  message = '';
  obj = [];
  meetupForm: FormGroup;
  readonly dbName = 'meetups'; // database name constant
  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private fb: FormBuilder,
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

}
