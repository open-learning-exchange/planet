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
    console.log(`Updated ${key} to ${value}. Current status:`, { ...this.userStatus });
  }

  getCompleteChallenge(): boolean {
    console.log('Checking completion with status:', { ...this.userStatus });
    const complete = Object.values(this.userStatus).every(value => value === true);
    console.log('Completion result:', complete);
    return complete;
  }

  getStatus(key: string): boolean {
    return this.userStatus[key];
  }

  printStatus(): any {
    return this.userStatus;
  }
}

