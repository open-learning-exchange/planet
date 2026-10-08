import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatDialogContent } from '@angular/material/dialog';
import { vi } from 'vitest';

import { ExamsQuestionFrameComponent } from './exams-question-frame.component';

@Component({
  template: `
    <mat-dialog-content>
      <planet-exams-question-frame [questionNum]="questionNum" [maxQuestions]="3" [isDialog]="true"></planet-exams-question-frame>
    </mat-dialog-content>
  `,
  imports: [ MatDialogContent, ExamsQuestionFrameComponent ]
})
class DialogHostComponent {
  questionNum = 1;
}

describe('ExamsQuestionFrameComponent', () => {
  const nextTask = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ DialogHostComponent ]
    }).compileComponents();
  });

  it('scrolls the dialog content holding it to the top when it appears and when the question changes', async () => {
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    const scrollable = fixture.debugElement.query(By.css('mat-dialog-content')).injector.get(CdkScrollable);
    const scrollTo = vi.spyOn(scrollable, 'scrollTo').mockImplementation(() => {});
    await nextTask();

    expect(scrollTo).toHaveBeenCalledTimes(1);

    fixture.componentInstance.questionNum = 2;
    fixture.detectChanges();
    await nextTask();

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0 });
  });

  it('renders elapsed timer chip when elapsedSeconds is provided and toggles visibility on click', () => {
    localStorage.removeItem('planet_exam_timer_hidden');
    const fixture = TestBed.createComponent(ExamsQuestionFrameComponent);
    const component = fixture.componentInstance;
    component.elapsedSeconds = 75; // 01:15
    fixture.detectChanges();

    const timerChip = fixture.debugElement.query(By.css('.km-elapsed-time-chip'));
    expect(timerChip).not.toBeNull();
    expect(timerChip.nativeElement.textContent).toContain('01:15');

    // Click to hide
    timerChip.nativeElement.click();
    fixture.detectChanges();

    expect(component.isTimerHidden).toBe(true);
    expect(timerChip.nativeElement.textContent).toContain('Hidden');
    expect(localStorage.getItem('planet_exam_timer_hidden')).toBe('true');

    // Click to show
    timerChip.nativeElement.click();
    fixture.detectChanges();

    expect(component.isTimerHidden).toBe(false);
    expect(timerChip.nativeElement.textContent).toContain('01:15');
    expect(localStorage.getItem('planet_exam_timer_hidden')).toBe('false');
  });

  it('does not render elapsed timer chip when elapsedSeconds is null or undefined', () => {
    const fixture = TestBed.createComponent(ExamsQuestionFrameComponent);
    fixture.componentInstance.elapsedSeconds = null;
    fixture.detectChanges();

    const timerChip = fixture.debugElement.query(By.css('.km-elapsed-time-chip'));
    expect(timerChip).toBeNull();
  });
});
