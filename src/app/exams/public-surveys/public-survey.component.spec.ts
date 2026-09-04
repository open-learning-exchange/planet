import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PublicSurveyComponent } from './public-survey.component';
import { PublicSurveysService } from './public-surveys.service';
import { AndroidAppPromptService } from '../../shared/android-app-prompt.service';

describe('PublicSurveyComponent', () => {
  let fixture: ComponentFixture<PublicSurveyComponent>;
  const paramMap = convertToParamMap({ teamId: 'team-1', surveyId: 'survey-1' });
  const surveyResponse = {
    survey: {
      _id: 'survey-1',
      name: 'Community Health Check',
      description: 'A few questions about how the health post is serving you.',
      questions: [
        { body: 'How often do you visit?', type: 'select', choices: [] },
        { body: 'What would you change?', type: 'textarea', choices: [] }
      ],
      type: 'survey' as const
    },
    team: { _id: 'team-1', name: 'Bhaktapur Learning Center', type: 'team' }
  };
  const publicSurveysService = { getSurvey: vi.fn(), submitSurvey: vi.fn() };

  const createComponent = () => {
    TestBed.configureTestingModule({
      imports: [PublicSurveyComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
        { provide: PublicSurveysService, useValue: publicSurveysService },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: AndroidAppPromptService, useValue: { openIfEligible: vi.fn() } },
        provideHttpClient(withInterceptorsFromDi())
      ]
    });
    fixture = TestBed.createComponent(PublicSurveyComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    publicSurveysService.getSurvey.mockReturnValue(of(surveyResponse));
  });

  afterEach(() => {
    publicSurveysService.getSurvey.mockReset();
    publicSurveysService.submitSurvey.mockReset();
  });

  it('welcomes the visitor with the survey name and description instead of the first question', () => {
    createComponent();

    const intro = fixture.debugElement.query(By.css('.km-survey-intro'));

    expect(intro).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.km-survey-name')).nativeElement.textContent)
      .toContain('Community Health Check');
    expect(intro.nativeElement.textContent).toContain('invited');
    expect(intro.nativeElement.textContent).toContain('Bhaktapur Learning Center');
    expect(fixture.debugElement.query(By.css('planet-exams-question-frame'))).toBeNull();
  });

  it('tells the visitor up front how many questions there are', () => {
    createComponent();

    expect(fixture.debugElement.query(By.css('.km-survey-intro')).nativeElement.textContent).toContain('2 questions');
  });

  it('opens the first question only once the visitor chooses to start', () => {
    createComponent();

    fixture.debugElement.query(By.css('.km-start-survey')).triggerEventHandler('click');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.km-survey-intro'))).toBeNull();
    expect(fixture.debugElement.query(By.css('planet-exams-question-frame'))).toBeTruthy();
    expect(fixture.componentInstance.questionNum).toBe(1);
  });

  it('shows the error state rather than a welcome when the survey is unavailable', () => {
    publicSurveysService.getSurvey.mockReturnValue(throwError({ error: { message: 'Survey not found or not public' } }));

    createComponent();

    expect(fixture.debugElement.query(By.css('.km-survey-intro'))).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Survey not found or not public');
  });
});
