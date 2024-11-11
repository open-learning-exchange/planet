import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UserChallengeStatusService {
  userStatus = {
    joinedCourse: false,
    surveyComplete: false,
    hasPost: false
  };

  updateStatus(key: string, value: boolean) {
    this.userStatus[key] = value;
  }

  getCompleteChallenge(): boolean {
    const complete = Object.values(this.userStatus).every(value => value === true);
    return complete;
  }

  getStatus(key: string): boolean {
    return this.userStatus[key];
  }

  printStatus(): any {
    return this.userStatus;
  }

  resetStatus() {
    this.userStatus = {
      joinedCourse: false,
      surveyComplete: false,
      hasPost: false
    };
  }
}
