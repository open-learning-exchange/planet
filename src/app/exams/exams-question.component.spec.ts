import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExamsQuestionComponent } from './exams-question.component';
import { ExamsService } from './exams.service';

describe('ExamsQuestionComponent', () => {
  let examsService: ExamsService;
  let cdRef: ChangeDetectorRef;
  let component: ExamsQuestionComponent;

  beforeEach(() => {
    const fb = new FormBuilder().nonNullable;
    examsService = new ExamsService(fb, {} as any, {} as any, {} as any);
    cdRef = { detectChanges: vi.fn() } as any;
    component = new ExamsQuestionComponent(examsService, cdRef);
  });

  it('defaults imageGroup to community', () => {
    expect(component.imageGroup).toBe('community');
  });

  it('initializes questionForm with requiredMarkdown validator allowing text and image objects', () => {
    expect(component.questionForm).toBeDefined();
    expect(component.questionForm.controls.body).toBeDefined();

    component.questionForm.controls.body.setValue({ text: 'Question with diagram', images: [ { resourceId: 'res-1' } ] });
    expect(component.questionForm.controls.body.valid).toBe(true);

    component.questionForm.controls.body.setValue('');
    expect(component.questionForm.controls.body.valid).toBe(false);
  });

  it('adds and removes choices properly', () => {
    expect(component.choices.length).toBe(0);

    component.addChoice();
    expect(component.choices.length).toBe(1);

    component.removeChoice(0);
    expect(component.choices.length).toBe(0);
  });
});
