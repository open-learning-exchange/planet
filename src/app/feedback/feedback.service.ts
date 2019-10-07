import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  readonly dbName = 'feedback';
  private feedbackUpdate = new Subject<any[]>();
  feedbackUpdate$ = this.feedbackUpdate.asObservable();

  setfeedback() {
    this.feedbackUpdate.next();
  }

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  openFeedback(feedback: any) {
    return this.modifyFeedback(
      { ...feedback, closeTime: '', status: 'Reopened' },
      'You re-opened this feedback.'
    );
  }


  closeFeedback(feedback: any) {
    return this.modifyFeedback(
      { ...feedback, 'closeTime': this.couchService.datePlaceholder, 'status': 'Closed' },
      'You closed this feedback.'
    );
  }

  modifyFeedback(feedback: any, message) {
    return this.couchService.updateDocument(this.dbName, feedback).pipe(map((data) => {
      this.planetMessageService.showMessage(message);
    }));
  }

}
