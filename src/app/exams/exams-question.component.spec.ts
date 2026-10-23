import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExamsQuestionComponent } from './exams-question.component';
import { ExamsService } from './exams.service';

describe('ExamsQuestionComponent', () => {
  let examsService: ExamsService;
  let cdRef: ChangeDetectorRef;
  let component: ExamsQuestionComponent;
  const image = { resourceId: 'res-1', filename: 'diagram.png', markdown: '![diagram](resources/res-1/diagram.png)' };

  beforeEach(() => {
    const fb = new FormBuilder().nonNullable;
    examsService = new ExamsService(fb, {} as any, {} as any, {} as any);
    cdRef = { detectChanges: vi.fn() } as any;
    component = new ExamsQuestionComponent(examsService, cdRef);
  });

  it('accepts a question body with images and rejects an empty one', () => {
    component.questionForm.controls.body.setValue({ text: 'Question with diagram', images: [ image ] });
    expect(component.questionForm.controls.body.valid).toBe(true);

    component.questionForm.controls.body.setValue('');
    expect(component.questionForm.controls.body.valid).toBe(false);
  });

  it('loads a question body with images as plain markdown text', () => {
    const question = examsService.newQuestionForm(false);
    question.controls.body.setValue({ text: `Question with ${image.markdown}`, images: [ image ] });

    component.question = question;
    component.ngOnChanges();

    expect(component.questionForm.controls.body.value).toBe(`Question with ${image.markdown}`);
  });
});
