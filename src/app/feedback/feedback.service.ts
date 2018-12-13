import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { map } from 'rxjs/operators';


@Injectable()
export class FeedbackService {
  readonly dbName = 'feedback';
  private feedbackUpdate = new Subject<any[]>();
  feedbackUpdate$ = this.feedbackUpdate.asObservable();

  setfeedback() {
    this.feedbackUpdate.next();
  }

  constructor(private couchService: CouchService,
              private planetMessageService: PlanetMessageService){

  }

  openFb(feedback: any){
      const updateFeedback =  { ...feedback, closeTime: '',  status: 'Reopened' };
      return this.couchService.put(this.dbName + '/' + feedback._id, updateFeedback).pipe(map((data) => {
        this.planetMessageService.showMessage('You re-opened this feedback.');
      }));
    }
  }
