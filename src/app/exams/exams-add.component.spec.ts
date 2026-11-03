import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownImagesService } from '@shared/markdown/markdown-images.service';

import { ExamsAddComponent } from './exams-add.component';
import { ExamsService } from './exams.service';

describe('ExamsAddComponent', () => {
  it('keeps saved images when an exam is updated without opening its questions', () => {
    const image = { resourceId: 'res-1', filename: 'diagram.png', markdown: '![diagram](resources/res-1/diagram.png)' };
    const exam = {
      _id: 'exam-1',
      _rev: '1-a',
      name: 'Exam',
      description: '',
      passingPercentage: 100,
      type: 'courses',
      teamShareAllowed: false,
      questions: [ { body: `Look at ${image.markdown}`, type: 'input', marks: 1, choices: [] } ],
      images: [ image ]
    };
    const params = { type: 'exam', id: exam._id };
    const route = { snapshot: { paramMap: { get: (key: string) => params[key] }, url: [ { path: 'update' } ] } };
    const fb = new FormBuilder().nonNullable;
    const component = new ExamsAddComponent(
      { url: `/courses/update/exam/${exam._id}` } as any,
      route as any,
      fb,
      { get: vi.fn().mockReturnValue(of(exam)) } as any,
      { isUnique$: () => of(null) } as any,
      {} as any,
      { course: {} } as any,
      new ExamsService(fb, {} as any, {} as any, {} as any),
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new MarkdownImagesService(),
      {} as any
    );
    const addExam = vi.spyOn(component, 'addExam').mockImplementation(() => {});

    component.ngOnInit();
    component.onSubmit();

    expect(addExam.mock.calls[0][0]).toMatchObject({ images: [ image ], questions: [ { body: exam.questions[0].body } ] });
  });
});
