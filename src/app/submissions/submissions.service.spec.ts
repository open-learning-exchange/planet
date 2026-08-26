import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  const createService = () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      currentTime: vi.fn().mockReturnValue(of(0))
    };
    return new SubmissionsService(
      couchService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      'en'
    );
  };

  it('exports a legacy survey without a questions field as an empty question set', async () => {
    const service = createService();

    const result = await service.getSubmissionsExport({ _id: 'survey-1' }, 'survey').toPromise();

    expect(result[2]).toEqual([]);
  });

  it('handles submission navigation and grading when parent questions are missing', () => {
    const service = createService();
    const submission = { parent: {}, answers: [ { passed: true, grade: 1 } ] };

    expect(service.shouldCloseSubmission(submission, 'passed')).toBe(true);
    expect(service.findNextQuestion(submission, 0, 'passed')).toBe(-1);
    expect(service.calcTotalGrade(submission)).toBe(0);
  });
});
