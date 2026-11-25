import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { MarkdownRenderService } from '@shared/markdown/markdown-render.service';

import { SubmissionsService } from './submissions.service';
import { attemptPasses } from '../courses/courses.utils';

describe('SubmissionsService survey exports', () => {
  let service: SubmissionsService;
  let csvService: { exportCSV: ReturnType<typeof vi.fn> };
  let dialogsLoadingService: { stop: ReturnType<typeof vi.fn> };
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn>, showMessage: ReturnType<typeof vi.fn> };
  let pdfService: { download: ReturnType<typeof vi.fn>, getHtmlConverter?: ReturnType<typeof vi.fn> };
  let couchService: {
    post: ReturnType<typeof vi.fn>; findAll: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>; datePlaceholder: string;
  };
  let coursesService: { updateProgress: ReturnType<typeof vi.fn> };

  const exam = {
    _id: 'team-survey-1',
    name: 'Team survey',
    teamId: 'team-1',
    questions: [ { body: 'Question' } ]
  };
  const submissionWithEmbeddedTeam = {
    _id: 'submission-1',
    androidId: 'android-1',
    answers: [ { value: 'Answer' } ],
    lastUpdateTime: 1,
    parent: { _id: exam._id, teamId: exam.teamId, questions: exam.questions },
    source: 'planet-1',
    user: { age: 20, gender: 'female' }
  };

  beforeEach(() => {
    csvService = { exportCSV: vi.fn() };
    dialogsLoadingService = { stop: vi.fn() };
    planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
    pdfService = { download: vi.fn().mockResolvedValue(undefined) };
    couchService = { post: vi.fn(), findAll: vi.fn(), get: vi.fn(), updateDocument: vi.fn(), datePlaceholder: 'NOW' };
    coursesService = { updateProgress: vi.fn() };
    service = new SubmissionsService(
      couchService as any,
      { configuration: { name: 'Planet', code: 'planet-1' } } as any,
      coursesService as any,
      {} as any,
      csvService as any,
      planetMessageService as any,
      dialogsLoadingService as any,
      { getChildPlanets: vi.fn().mockReturnValue(of([])) } as any,
      {} as any,
      pdfService as any,
      TestBed.inject(MarkdownRenderService),
      'en-US'
    );
    vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
      [ submissionWithEmbeddedTeam ],
      1,
      [ 'Question' ]
    ]) as any);
  });

  it('starts each recorded response fresh without looking up an earlier submission', () => {
    const user = { name: 'recorder' };
    const team = { _id: 'team-1', name: 'Team', type: 'team' };
    const recording = { parentId: exam._id, parent: exam, user, type: 'survey', team };
    service.startNewSubmission(recording);
    service.submission.answers.push({ value: 'First person' });
    const firstSubmission = service.submission;

    service.startNewSubmission(recording);

    expect(service.submission).not.toBe(firstSubmission);
    expect(service.submission.answers).toEqual([]);
    expect(service.submission.team).toEqual(team);
    expect(couchService.post).not.toHaveBeenCalled();
  });

  describe('opening a test', () => {
    const testCopy = (_rev: string, marks: (number | string)[] = [ 10 ], passingPercentage: number | string = 80) =>
      ({ _rev, questions: marks.map(m => ({ marks: m })), passingPercentage });
    const open = (docs: any[], parent = testCopy('2-b'), type = 'exam') => {
      couchService.findAll.mockReturnValue(of(docs));
      const updated = vi.fn();
      service.submissionUpdated$.subscribe(updated);
      service.openSubmission({ parentId: 'exam-1@course-1', parent, user: { name: 'learner' }, type });
      return updated.mock.calls[0][0];
    };
    const selector = () => couchService.findAll.mock.calls[0][1].selector;

    it('counts attempts from an older revision and still opens a fresh pending attempt on the current one', () => {
      const { submission, attempts, passed } = open([
        { _id: 'graded', status: 'complete', grade: 8, parent: testCopy('1-a'), answers: [ {} ] },
        { _id: 'waiting', status: 'requires grading', grade: 0, parent: testCopy('1-a'), answers: [ {} ] },
        { _id: 'abandoned', status: 'pending', grade: 0, parent: testCopy('1-a'), answers: [ {} ] }
      ]);

      expect(selector()).not.toHaveProperty([ 'parent._rev' ]);
      expect(attempts).toBe(2);
      expect(passed).toBe(true);
      expect(submission._id).toBeUndefined();
      expect(submission.parent._rev).toBe('2-b');
      expect(submission.answers).toEqual([]);
    });

    it('resumes the unfinished attempt on the current revision', () => {
      const { submission, attempts } = open([
        { _id: 'abandoned', status: 'pending', grade: 0, parent: testCopy('1-a'), answers: [ {} ] },
        { _id: 'current', status: 'pending', grade: 0, parent: testCopy('2-b'), answers: [ {} ] }
      ]);

      expect(submission._id).toBe('current');
      expect(attempts).toBe(0);
    });

    it('passes on any attempt that passed its own copy, even one scoring less than a failed attempt', () => {
      const { passed } = open([
        { _id: 'stricter', status: 'complete', grade: 9, parent: testCopy('1-a', [ 10 ], 100), answers: [] },
        { _id: 'lowered', status: 'complete', grade: 8, parent: testCopy('2-b', [ 10 ], 80), answers: [] }
      ]);

      expect(passed).toBe(true);
    });

    it('keeps a survey response tied to the revision it answered', () => {
      open([], testCopy('2-b'), 'survey');

      expect(selector()['parent._rev']).toBe('2-b');
    });

    it.each([
      [ 'at exactly the pass mark', 'complete', 29, testCopy('1-a', [ 50 ], 58), true ],
      [ 'below the pass mark', 'complete', 7, testCopy('1-a', [ 10 ], 80), false ],
      [ 'graded zero against a zero pass mark', 'complete', 0, testCopy('1-a', [ 10 ], 0), true ],
      [ 'unfinished, against a zero pass mark', 'pending', 10, testCopy('1-a', [ 10 ], 0), false ],
      [ 'waiting for grading, against a zero pass mark', 'requires grading', 10, testCopy('1-a', [ 10 ], 0), false ],
      [ 'on a test with no questions', 'complete', 0, testCopy('1-a', [], 0), false ],
      [ 'from myPlanet, below full marks', 'complete', 1, testCopy('1-a', [ '', '' ], ''), false ],
      [ 'from myPlanet, at full marks', 'complete', 2, testCopy('1-a', [ '', '' ], ''), true ]
    ])('judges an attempt %s', (_, status, grade, parent, passes) => {
      expect(attemptPasses({ status, grade, parent })).toBe(passes);
    });
  });

  describe('finishing a test', () => {
    const learner = { name: 'learner', _id: 'org.couchdb.user:learner' };
    const attempt = (marks: (number | string)[], passingPercentage: number | string) => ({
      type: 'exam', parentId: 'exam-1@course-1', user: learner, status: 'requires grading', grade: 1,
      parent: { questions: marks.map(m => ({ marks: m })), passingPercentage },
      answers: [ { value: 'yes', grade: 1 }, { value: 'because' } ]
    });

    beforeEach(() => {
      couchService.updateDocument.mockReturnValue(of({ id: 'attempt-1', rev: '2-a' }));
      couchService.get.mockReturnValue(of({ steps: [ {}, { exam: { _id: 'exam-1' } } ] }));
    });

    it.each([
      [ 'at its pass mark with an answer marked Incorrect', attempt([ 1, 1 ], 50), 0, 1 ],
      [ 'from myPlanet with every answer marked Correct', attempt([ '', '' ], ''), 1, 2 ]
    ])('saves the step as passed once the last grade is saved, %s', (_, submission, lastGrade, grade) => {
      service.submission = submission;
      service.submitGrade(lastGrade, 1, '').subscribe();

      expect(couchService.updateDocument).toHaveBeenCalledWith('submissions', expect.objectContaining({ status: 'complete', grade }));
      expect(coursesService.updateProgress).toHaveBeenCalledWith({ courseId: 'course-1', stepNum: 2, passed: true }, learner._id);
    });

    it('leaves progress alone when the attempt fails to save', () => {
      couchService.updateDocument.mockReturnValue(throwError(() => new Error('conflict')));
      service.submission = attempt([ 1, 1 ], 50);
      service.submitGrade(1, 1, '').subscribe({ error: () => {} });

      expect(coursesService.updateProgress).not.toHaveBeenCalled();
    });

    it.each([
      [ 'a survey', { type: 'survey', parentId: 'survey-1@course-1', answers: [ { value: 'fine' } ] }, 0 ],
      [
        'a test removed from its step',
        { ...attempt([ 1, 1 ], 50), parentId: 'exam-2@course-1', answers: [ { grade: 1 }, { grade: 1 } ] },
        1
      ]
    ])('saves no progress for %s', (_, submission, courseLookups) => {
      service.updateSubmission({ ...submission, user: learner }, false, -1).subscribe();

      expect(couchService.get).toHaveBeenCalledTimes(courseLookups);
      expect(coursesService.updateProgress).not.toHaveBeenCalled();
    });
  });

  it('exports a CSV submission counted through its embedded team', async () => {
    const [ submissions ] = await service.exportSubmissionsCsv(exam, 'survey', 'team-1').toPromise();

    expect(submissions.map(submission => submission._id)).toEqual([ 'submission-1' ]);
    expect(csvService.exportCSV).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Survey - Team survey (1)'
    }));
  });

  it('exports a PDF submission counted through its embedded team', async () => {
    const buildPdf = vi.spyOn(service, 'buildInitialSubmissionPDF').mockResolvedValue([]);

    await service.exportSubmissionsPdf(exam, 'survey', {
      includeQuestions: true,
      includeAnswers: true,
      includeCharts: false,
      includeAnalysis: false
    }, 'team-1');

    await vi.waitFor(() => expect(buildPdf).toHaveBeenCalledWith(
      exam,
      [ expect.objectContaining({ _id: 'submission-1' }) ],
      [ 'Question' ],
      expect.any(Object)
    ));
    expect(pdfService.download).toHaveBeenCalled();
    expect(planetMessageService.showMessage).not.toHaveBeenCalledWith('There is no survey response');
  });

  const capturePdfHtml = async (exportOptions: { includeAnswers: boolean, includeQuestions: boolean }) => {
    const htmlToPdfmake = vi.fn().mockReturnValue([]);
    pdfService.getHtmlConverter = vi.fn().mockResolvedValue(htmlToPdfmake);
    await service.buildInitialSubmissionPDF(exam, [ submissionWithEmbeddedTeam ], [ 'Question' ], exportOptions);
    return htmlToPdfmake.mock.calls.map(call => call[0]).join('\n');
  };

  it('assembles questions-only PDF content as HTML', async () => {
    const html = await capturePdfHtml({ includeQuestions: true, includeAnswers: false });

    expect(html).toContain('<h3>');
    expect(html).not.toContain('###');
    expect(html).toContain('markdown-align-left');
  });

  it('assembles response PDF content as sanitized HTML with alignment classes', async () => {
    const html = await capturePdfHtml({ includeQuestions: true, includeAnswers: true });

    expect(html).toContain('markdown-align-right');
    expect(html).not.toContain('style="text-align');
    expect(html).not.toContain('###');
  });

  describe('the exported age', () => {

    const time = new Date(2026, 8, 4).valueOf();

    const exportedAgeOf = async (user: any) => {
      vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
        [ { ...submissionWithEmbeddedTeam, user } ],
        time,
        [ 'Question' ]
      ]) as any);
      await service.exportSubmissionsCsv(exam, 'survey', 'team-1').toPromise();
      return csvService.exportCSV.mock.lastCall[0].data[0]['Age (years)'];
    };

    it('counts the years lived when the submission carries a birth date', async () => {
      expect(await exportedAgeOf({ birthDate: new Date(1998, 8, 4).toJSON(), age: 12 })).toBe(28);
    });

    it('falls back to the age myPlanet sent when there is no birth date', async () => {
      expect(await exportedAgeOf({ age: 20 })).toBe(20);
    });

    it('exports an age of zero rather than calling it unknown', async () => {
      expect(await exportedAgeOf({ age: 0 })).toBe(0);
    });

    it('exports N/A when the age is blank or missing', async () => {
      expect(await exportedAgeOf({ age: '' })).toBe('N/A');
      expect(await exportedAgeOf({})).toBe('N/A');
    });

  });

  it('preserves an age of zero in the AI analysis payload', async () => {
    const getPrompt = vi.fn().mockReturnValue(of({ chat: 'Analysis' }));
    (service as any).chatService = { getPrompt };

    await service.analyseResponses(
      { ...exam, type: 'survey', description: '', questions: [ { body: 'Question', type: 'text' } ] },
      [ { ...submissionWithEmbeddedTeam, user: { age: 0 } } ]
    );

    expect(getPrompt.mock.calls[0][0].content).toContain('"age": 0');
  });

  it('sends only a specified gender in the AI analysis payload', async () => {
    const getPrompt = vi.fn().mockReturnValue(of({ chat: 'Analysis' }));
    (service as any).chatService = { getPrompt };

    await service.analyseResponses(
      { ...exam, type: 'survey', description: '', questions: [ { body: 'Question', type: 'text' } ] },
      [ { ...submissionWithEmbeddedTeam, user: { age: 20 } }, { ...submissionWithEmbeddedTeam, user: { age: 20, gender: ' Other ' } } ]
    );

    const { content } = getPrompt.mock.calls[0][0];
    expect(content).toContain('"gender": "other"');
    expect(content).not.toContain('didNotSpecify');
  });

  it('charts a myPlanet Other answer, saved as the typed text alone, as Other', () => {
    const question = { index: 0, type: 'select', hasOtherOption: true, choices: [ { id: 'a', text: 'Yes' } ] };
    const submissions = [
      { _id: 'planet-other', answers: [ { value: { id: 'other', text: 'Maybe', isOther: true } } ] },
      { _id: 'myplanet-other', answers: [ { value: 'Maybe' } ] },
      { _id: 'myplanet-choice', answers: [ { value: 'Yes' } ] }
    ];

    const { labels, data } = service.aggregateQuestionResponses(question, submissions, 'count');

    expect(labels).toEqual([ 'Yes', 'Other' ]);
    expect(data).toEqual([ 1, 2 ]);
  });
});
