import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class FeedbackService {

  private feedbackUpdate = new Subject<any[]>();
  feedbackUpdate$ = this.feedbackUpdate.asObservable();

  setfeedback() {
    this.feedbackUpdate.next();
  }

}
