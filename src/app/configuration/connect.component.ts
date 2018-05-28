import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { switchMap, mergeMap, catchError } from 'rxjs/operators';
import { UserService } from '../shared/user.service';
import { of } from 'rxjs/observable/of';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { debug } from '../debug-operator';

@Component({
  selector: 'planet-connect',
  templateUrl: './connect.component.html'
})
export class ConnectComponent implements OnInit {
  message = '';

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {

  }

  openConfirmation() {
    const title = 'Admin Confirmation';
    const fields = [
      {
        'label': 'Password',
        'type': 'textbox',
        'inputType': 'password',
        'name': 'password',
        'placeholder': 'Password',
        'required': true
      }
    ];
    const formGroup = {
      password: [ '', Validators.required ]
    };
    this.dialogsFormService
    .confirm(title, fields, formGroup)
    .pipe(debug('Dialog confirm'))
    .subscribe((response: any) => {
      if (response !== undefined) {
        this.couchService.post('_session', { name: this.userService.get().name, password: response.password })
        .pipe(switchMap(data => {
          return this.connectNation(response.password);
        }))
        .subscribe(data => {
          this.planetMessageService.showMessage('Request sent to parent');
          this.router.navigate([ '/' ]);
        }, error => this.planetMessageService.showMessage('Invalid password'));
      }
    });
  }

  connectNation(adminPassword) {
    const cred = this.openConfirmation();
    const credentials = { name: this.userService.get().name, password: adminPassword };
    return forkJoin([
      this.couchService.allDocs('configurations'),
      this.couchService.get('_users/org.couchdb.user:' + credentials.name)
    ]).pipe(switchMap((data: [[any], any]) => {
      // truncate extra records before pushing to parent
      const { _id: confId, _rev: confRev, ...configuration } = data[0][0];
      const { _id: userId, _rev: userRev,
        password_scheme: userScheme, iterations: userIteration,
        derived_key: userKey, salt: userSalt,
        ...userDetail } = data[1];
      const adminName = credentials.name + '@' + configuration.code;
      const feedbackSyncUp = {
        '_id': 'feedback_to_parent',
        'source': {
          'headers': {
            'Authorization': 'Basic ' + btoa(credentials.name + ':' + credentials.password)
          },
          'url': environment.couchAddress + 'feedback'
        },
        'target': {
          'headers': {
            'Authorization': 'Basic ' + btoa(adminName + ':' + credentials.password)
          },
          'url': 'https://' + configuration.parentDomain + '/feedback'
        },
        'create_target':  false,
        'continuous': true,
        'owner': credentials.name
      };
      const feedbackSyncDown = Object.assign({}, feedbackSyncUp, {
        '_id': 'feedback_from_parent',
        'source': feedbackSyncUp.target,
        'target': feedbackSyncUp.source,
        'selector': {
          'source': configuration.code
        }
      });
      return forkJoin([
        // create replicator at first as we do not have session
        this.couchService.post('_replicator', feedbackSyncUp),
        this.couchService.post('_replicator', feedbackSyncDown),
        // then post configuration to parent planet's registration requests
        this.couchService.post('communityregistrationrequests', configuration, { domain: configuration.parentDomain })
          .pipe(switchMap(requestData => {
            // then add user to parent planet with id of configuration and isUserAdmin set to false
            userDetail['requestId'] =  requestData.id;
            userDetail['isUserAdmin'] =  false;
            return this.couchService.put('_users/org.couchdb.user:' + adminName,
              { ...userDetail, name: adminName, password: adminPassword }, { domain: configuration.parentDomain });
          }), switchMap(requestData => {
            return this.couchService.put('shelf/org.couchdb.user:' + adminName, { }, { domain: configuration.parentDomain });
          }), switchMap(requestData => {
            const requestNotification = {
              'user': 'SYSTEM',
              'message': 'New ' + configuration.planetType + ' "' + configuration.name + '" has requested to connect.',
              'link': '/requests',
              'type': 'request',
              'priority': 1,
              'status': 'unread',
              'time': Date.now()
            };
            // Send notification to parent
            return this.couchService.post('notifications', requestNotification, { domain: configuration.parentDomain });
          }),
          catchError(err => {
            this.planetMessageService.showAlert('There was an error creating planet');
            return of(false);
          })
        )
      ]).pipe(debug('Sending request to parent planet'));
    }));
  }

}
