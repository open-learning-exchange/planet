import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { languages } from '../shared/languages';
import { interval } from 'rxjs/observable/interval';
import { tap, switchMap } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsFormComponent } from '../shared/dialogs/dialogs-form.component';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { FormBuilder, FormControl, FormGroup, Validators, FormControlName } from '@angular/forms';

@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px'
      })),
      state('open', style({
        width: '150px'
      })),
      transition('closed <=> open', animate('500ms ease'))
    ])
  ]
})

export class HomeComponent implements OnInit, AfterViewInit {

  name = '';
  message: string;
  roles: string[] = [];
  languages = [];
  current_flag = 'en';
  current_lang = 'English';
  sidenavState = 'closed';
  @ViewChild('content') private mainContent;

  priorityType = [
    'Yes',
    'No',
  ];

  feedbackType = [
    'Question',
    'Bug',
    'Suggestion',
  ];

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).debug('Menu animation').pipe(tap(() => {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }));
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService
  ) {}

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.languages = (<any>languages).map(language => {
      if (language.served_url === document.baseURI) {
        this.current_flag = language.short_code;
        this.current_lang = language.name;
      }
      return language;
    }).filter(lang  => {
      return lang['active'] !== 'N';
    });
  }

  ngAfterViewInit() {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }

  backgroundRoute() {
    const routesWithBackground = [ 'resources', 'courses' ];
    const routesWithoutBackground = [ 'resources/add', 'resources/view' ];
    const isException = routesWithoutBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    const isRoute = routesWithBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    return isRoute && !isException;
  }

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.animDisp = this.animObs.subscribe();
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

  switchLanguage(served_url) {
    alert('You are going to switch in ' + served_url + ' environment');
  }

  logoutClick() {
    this.userService.endSessionLog().pipe(switchMap(() => {
      return this.couchService.delete('_session', { withCredentials: true });
    })).subscribe((response: any) => {
      if (response.ok === true) {
        this.userService.unset();
        this.router.navigate([ '/login' ], {});
      }
    }, err => console.log(err));
  }

  openFeedback() {
    const title = 'Feedback';
    const type = 'feedback';
    const fields =
      [
        { 'label': 'Is your feedback Urgent?', 'type': 'radio', 'name': 'priority', 'options': this.priorityType, 'required': true },
        { 'label': 'Feedback Type:', 'type': 'radio', 'name': 'type', 'options': this.feedbackType, 'required': true },
        { 'type': 'textarea', 'name': 'message', 'placeholder': 'Your Feedback', 'required': true }
      ];
    const formGroup = {
      priority: [ '', Validators.required ],
      type: [ '', Validators.required ],
      message: [ '', Validators.required ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((response) => {
        if (response !== undefined) {
          this.onSubmit(response);
        }
      });
  }

  onSubmit(post: any) {
    this.message = '';
    const user = this.userService.get().name,
      { message, ...feedbackInfo } = post,
      startingMessage: Message = { message, time: Date.now(), user },
      newFeedback: Feedback = { owner: user, ...feedbackInfo, openTime: Date.now(), messages: [ startingMessage ] };
    this.couchService.post('feedback/', newFeedback)
    .subscribe((data) => {
      this.message = 'Thank you, your feedback is submitted!';
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
    });
  }

}

export class Message {
  message: string;
  user: string;
  time: Number;
}

export class Feedback {
  type: string;
  priority: boolean;
  owner: string;
  title: string;
  openTime: Number;
  closeTime: Number;
  source: string;
  url: string;
  messages: Array<Message>;
}
