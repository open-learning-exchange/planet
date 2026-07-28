import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { ExamAnswerValue } from '../exams-take/exam-answer.helpers';

export interface PublicSurveyDemographics {
  age?: number;
  gender?: string;
}

export interface PublicSurvey {
  _id: string;
  name: string;
  description?: string;
  questions: any[];
  type: 'survey';
}

export interface PublicSurveyResponse {
  survey: PublicSurvey;
  team: { _id: string; name: string; type: string };
}

@Injectable({
  providedIn: 'root'
})
export class PublicSurveysService {
  private readonly baseUrl = `${environment.chatAddress}${environment.production ? '/api' : ''}/public/surveys`;

  constructor(private http: HttpClient) {}

  getSurvey(teamId: string, surveyId: string) {
    return this.http.get<PublicSurveyResponse>(`${this.baseUrl}/${teamId}/${surveyId}`);
  }

  submitSurvey(teamId: string, surveyId: string, answers: ExamAnswerValue[], user?: PublicSurveyDemographics) {
    return this.http.post(`${this.baseUrl}/${teamId}/${surveyId}/submissions`, { answers, user });
  }
}
