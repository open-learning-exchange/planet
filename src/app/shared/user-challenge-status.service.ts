import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UserChallengeStatusService {
  userStatus = {
    joinedCourse: false,
    surveyComplete: false,
    hasPost: false,
    userPosts: 0
  };

  updateStatus(key: string, value: boolean | number) {
    this.userStatus[key] = value;
  }

  getCompleteChallenge(): boolean {
    const complete = Object.values(this.userStatus).every(
      (value, index) => index !== 3 && value === true
    );
    return complete;
  }

  getStatus(key: string): boolean| number {
    return this.userStatus[key];
  }

  printStatus(): any {
    return this.userStatus;
  }

  resetStatus() {
    this.userStatus = {
      joinedCourse: false,
      surveyComplete: false,
      hasPost: false,
      userPosts: 0
    };
  }
}
