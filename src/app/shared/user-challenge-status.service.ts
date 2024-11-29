import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UserChallengeStatusService {
  userStatus = {
    joinedCourse: {
      status: false,
      amount: 0
    },
    surveyComplete: {
      status: false,
      amount: 0
    },
    hasPost: {
      status: false,
      amount: 0
    },
    userPosts: 0
  };

  updateStatus(key: string, value: Object | number) {
    this.userStatus[key] = value;
  }

  getCompleteChallenge(): boolean {
    const complete = Object.values(this.userStatus).every(
      (value, index) => typeof value === 'object' && 'status' in value && value.status === true
    );
    return complete;
  }

  getPosts(): number {
    return this.userStatus.userPosts;
  }

  getStatus(key: string): boolean {
    return this.userStatus[key].status;
  }

  printStatus(): any {
    return this.userStatus;
  }

  resetStatus() {
    this.userStatus = {
      joinedCourse: {
        status: false,
        amount: 0
      },
      surveyComplete: {
        status: false,
        amount: 0
      },
      hasPost: {
        status: false,
        amount: 0
      },
      userPosts: 0
    };
  }
}
