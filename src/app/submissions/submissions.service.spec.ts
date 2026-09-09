import { of } from 'rxjs';

import { SubmissionsService } from './submissions.service';

describe('SubmissionsService survey exports', () => {
  let service: SubmissionsService;
  let csvService: { exportCSV: ReturnType<typeof vi.fn> };
  let dialogsLoadingService: { stop: ReturnType<typeof vi.fn> };
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn>; showMessage: ReturnType<typeof vi.fn> };
  let pdfService: { download: ReturnType<typeof vi.fn> };

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
    service = new SubmissionsService(
      {} as any,
      { configuration: { name: 'Planet' } } as any,
      {} as any,
      {} as any,
      csvService as any,
      planetMessageService as any,
      dialogsLoadingService as any,
      { getChildPlanets: vi.fn().mockReturnValue(of([])) } as any,
      {} as any,
      pdfService as any,
      'en-US'
    );
    vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
      [ submissionWithEmbeddedTeam ],
      1,
      [ 'Question' ]
    ]) as any);
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
});
