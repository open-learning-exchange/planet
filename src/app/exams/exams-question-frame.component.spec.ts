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
});
