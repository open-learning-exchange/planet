import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownImagesService } from '@shared/markdown/markdown-images.service';

import { ExamsAddComponent } from './exams-add.component';
import { ExamsService } from './exams.service';

describe('ExamsAddComponent', () => {
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

  const createComponent = (params: { type: string, id?: string }, couchService: any, course: any = {}, submissions: any[] = []) => {
    const route = { snapshot: { paramMap: { get: (key: string) => params[key] }, url: [ { path: params.id ? 'update' : 'exam' } ] } };
    const router = { url: params.id ? `/courses/update/${params.type}/${params.id}` : '/courses/exam', navigateByUrl: vi.fn() };
    const fb = new FormBuilder().nonNullable;
    const examsService = new ExamsService(fb, {} as any, {} as any, {} as any);
    const messages = { showMessage: vi.fn(), showAlert: vi.fn() };
    const component = new ExamsAddComponent(
      router as any,
      route as any,
      fb,
      couchService,
      { isUnique$: () => of(null) } as any,
      messages as any,
      { course, stepIndex: 0, storeMarkdownImages: (doc: any) => doc } as any,
      examsService,
      {} as any,
      {} as any,
      { getSubmissions: () => of(submissions) } as any,
      {} as any,
      new MarkdownImagesService(),
      { start: vi.fn(), stop: vi.fn() } as any
    );
    return { component, examsService, messages, router };
  };

  it('keeps saved images when an exam is updated without opening its questions', () => {
    const { component } = createComponent({ type: 'exam', id: exam._id }, { get: vi.fn().mockReturnValue(of(exam)) });
    const addExam = vi.spyOn(component, 'addExam').mockImplementation(() => {});

    component.ngOnInit();
    component.onSubmit();

    expect(addExam.mock.calls[0][0]).toMatchObject({ images: [ image ], questions: [ { body: exam.questions[0].body } ] });
  });

  it('refreshes the stored course copy, _rev included, on every in-place save of a test', () => {
    let course: any = { _id: 'course-1', _rev: '3-c', steps: [ { exam: { _id: 'exam-1', _rev: '1-a' } }, { exam: { _id: 'exam-2' } } ] };
    const couchService = {
      get: vi.fn((path: string) => of(path.startsWith('courses/') ? course : exam)),
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn((_db: string, doc: any) => {
        course = { ...doc, _rev: '4-d' };
        return of({});
      })
    };
    const { component, examsService, messages } = createComponent(
      { type: 'exam', id: exam._id }, couchService, { courseId: 'course-1', steps: [ {} ] }
    );
    vi.spyOn(examsService, 'createExamDocument')
      .mockReturnValueOnce(of({ id: 'exam-1', rev: '2-b' }))
      .mockReturnValueOnce(of({ id: 'exam-1', rev: '3-b' }));

    component.ngOnInit();
    component.onSubmit();
    component.onSubmit();

    expect(couchService.updateDocument).toHaveBeenCalledTimes(2);
    expect(couchService.updateDocument).toHaveBeenNthCalledWith(1, 'courses', expect.objectContaining({
      _rev: '3-c',
      steps: [ { exam: expect.objectContaining({ _id: 'exam-1', _rev: '2-b', totalMarks: 1 }) }, { exam: { _id: 'exam-2' } } ]
    }));
    expect(couchService.updateDocument).toHaveBeenNthCalledWith(2, 'courses', expect.objectContaining({
      _rev: '4-d',
      steps: [ { exam: expect.objectContaining({ _id: 'exam-1', _rev: '3-b' }) }, { exam: { _id: 'exam-2' } } ]
    }));
    expect(messages.showMessage.mock.calls).toEqual([ [ 'Test updated successfully' ], [ 'Test updated successfully' ] ]);
  });

  it('asks for a course Submit and still returns when the stored course does not have the test yet', () => {
    const couchService = {
      get: vi.fn((path: string) => of(path.startsWith('courses/') ? { steps: [ { exam: { _id: 'exam-2' } } ] } : exam)),
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn()
    };
    const { component, examsService, messages, router } = createComponent(
      { type: 'exam', id: exam._id }, couchService, { courseId: 'course-1', steps: [ {} ] }
    );
    vi.spyOn(examsService, 'createExamDocument').mockReturnValue(of({ id: 'exam-1', rev: '2-b' }));

    component.ngOnInit();
    component.onSubmit(true);

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(messages.showMessage).toHaveBeenCalledWith('Test saved. Submit the course to publish it.');
    expect(router.navigateByUrl).toHaveBeenCalled();
  });

  it.each([
    [ 'new', { type: 'survey' }, [], 'Add' ],
    [ 'copied', { type: 'survey', id: 'survey-1' }, [ {} ], 'Copy' ]
  ])('leaves the stored course alone when a %s survey is saved to a step', (_label, params, submissions, pageType) => {
    const couchService = { findAll: vi.fn().mockReturnValue(of([])), get: vi.fn().mockReturnValue(of(exam)), updateDocument: vi.fn() };
    const { component, examsService, messages } = createComponent(
      params, couchService, { courseId: 'course-1', steps: [ {} ] }, submissions
    );
    vi.spyOn(examsService, 'createExamDocument').mockReturnValue(of({ id: 'survey-2', rev: '1-a' }));

    component.ngOnInit();
    component.onSubmit();

    expect(component.pageType).toBe(pageType);
    expect(couchService.get).not.toHaveBeenCalledWith('courses/course-1');
    expect(messages.showMessage).toHaveBeenCalledWith('Survey saved. Submit the course to publish it.');
  });
});
