import { of } from 'rxjs';

import { SubmissionsService } from './submissions.service';

describe('SubmissionsService survey exports', () => {
  let service: SubmissionsService;
  let couchService: { findAll: ReturnType<typeof vi.fn> };
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
    couchService = { findAll: vi.fn().mockReturnValue(of([])) };
    service = new SubmissionsService(
      couchService as any,
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

  it('exports the respondent rather than the account that collected the response', async () => {
    vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
      [ {
        ...submissionWithEmbeddedTeam,
        user: { _id: 'org.couchdb.user:gg', name: 'gg', age: '', gender: '' },
        respondent: { age: 34, gender: 'male' },
        collectedBy: { _id: 'org.couchdb.user:gg', name: 'gg' }
      } ],
      1,
      [ 'Question' ]
    ]) as any);

    await service.exportSubmissionsCsv(exam, 'survey', 'team-1').toPromise();

    expect(csvService.exportCSV).toHaveBeenCalledWith(expect.objectContaining({
      data: [ expect.objectContaining({ Gender: 'Male', 'Age (years)': 34 }) ]
    }));
  });

  it('labels responses by the app that recorded them', () => {
    expect(service.submissionOrigin({ channel: 'myplanet' })).toBe('myPlanet');
    expect(service.submissionOrigin({ channel: 'myplanet-lite' })).toBe('myPlanet');
    expect(service.submissionOrigin({ channel: 'public' })).toBe('Planet');
    expect(service.submissionOrigin({ app: 'myplanet-lite' })).toBe('myPlanet');
    expect(service.submissionOrigin({ androidId: 'android-1' })).toBe('myPlanet');
    // myPlanet Lite tagged nothing but a device name before it carried an app identifier.
    expect(service.submissionOrigin({ deviceName: 'samsung SM-A336E' })).toBe('myPlanet');
    expect(service.submissionOrigin({})).toBe('Planet');
  });

  it('takes the group type from the team document when the response does not carry one', async () => {
    couchService.findAll.mockReturnValue(of([ { _id: 'team-1', type: 'enterprise' } ]));
    vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
      [ { ...submissionWithEmbeddedTeam, team: { _id: 'team-1', name: 'Tech Pioneers' } } ],
      1,
      [ 'Question' ]
    ]) as any);

    await service.exportSubmissionsCsv(exam, 'survey', 'team-1').toPromise();

    expect(csvService.exportCSV).toHaveBeenCalledWith(expect.objectContaining({
      data: [ expect.objectContaining({ Group: 'Tech Pioneers', 'Group Type': 'Enterprise' }) ]
    }));
  });

  it('does not look up teams the responses already type', async () => {
    vi.spyOn(service, 'getSubmissionsExport').mockReturnValue(of([
      [ { ...submissionWithEmbeddedTeam, team: { _id: 'team-1', name: 'Tech Pioneers', type: 'team' } } ],
      1,
      [ 'Question' ]
    ]) as any);

    await service.exportSubmissionsCsv(exam, 'survey', 'team-1').toPromise();

    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(csvService.exportCSV).toHaveBeenCalledWith(expect.objectContaining({
      data: [ expect.objectContaining({ 'Group Type': 'Team' }) ]
    }));
  });
});
