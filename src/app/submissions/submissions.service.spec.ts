import { TestBed } from '@angular/core/testing';
import { SubmissionsService, formatCooloffDuration, RetakePolicyStatus } from './submissions.service';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { CoursesService } from '../courses/courses.service';
import { UserService } from '../shared/user.service';
import { CsvService } from '../shared/csv.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { ChatService } from '../shared/chat.service';
import { PdfService } from '../shared/pdf.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('SubmissionsService Retake Policy', () => {
  let service: SubmissionsService;

  const couchServiceMock = {
    findAll: vi.fn().mockReturnValue(of([])),
    post: vi.fn().mockReturnValue(of({ docs: [] })),
    updateDocument: vi.fn().mockReturnValue(of({ id: 'sub_1', rev: '1-abc' }))
  };

  const stateServiceMock = {
    configuration: { code: 'test-planet', parentCode: 'parent-planet' }
  };

  const courseServiceMock = {
    findCourses: vi.fn().mockReturnValue(of([])),
    updateProgress: vi.fn()
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue({ _id: 'user_1', name: 'Test User' })
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubmissionsService,
        { provide: CouchService, useValue: couchServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: CoursesService, useValue: courseServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: CsvService, useValue: {} },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        { provide: ManagerService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: PdfService, useValue: {} }
      ]
    });
    service = TestBed.inject(SubmissionsService);
  });

  describe('formatCooloffDuration', () => {
    it('should return empty string when remainingMs is 0 or negative', () => {
      expect(formatCooloffDuration(0)).toBe('');
      expect(formatCooloffDuration(-5000)).toBe('');
    });

    it('should format durations less than 1 hour as minutes', () => {
      expect(formatCooloffDuration(30000)).toBe('1m');
      expect(formatCooloffDuration(60000)).toBe('1m');
      expect(formatCooloffDuration(35 * 60 * 1000)).toBe('35m');
      expect(formatCooloffDuration(59 * 60 * 1000)).toBe('59m');
    });

    it('should format durations between 1 hour and 1 day as hours', () => {
      expect(formatCooloffDuration(3600000)).toBe('1h');
      expect(formatCooloffDuration(4 * 3600000)).toBe('4h');
      expect(formatCooloffDuration(24 * 3600000)).toBe('24h');
    });

    it('should format durations greater than 1 day as days', () => {
      expect(formatCooloffDuration(25 * 3600000)).toBe('2d');
      expect(formatCooloffDuration(48 * 3600000)).toBe('2d');
      expect(formatCooloffDuration(72 * 3600000)).toBe('3d');
    });
  });

  describe('evaluateRetakePolicy', () => {
    it('should allow exam start when no limits are set (default unlimited)', () => {
      const exam = { maxAttempts: 0, retakeCooloffHours: 0 };
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, []);

      expect(status.canStartExam).toBe(true);
      expect(status.isMaxAttemptsReached).toBe(false);
      expect(status.isCooloffActive).toBe(false);
      expect(status.attemptsUsed).toBe(0);
    });

    it('should block exam start when maxAttempts cap is reached', () => {
      const exam = { maxAttempts: 2, retakeCooloffHours: 0 };
      const submissions = [
        { status: 'complete', answers: [ { grade: 0 } ] },
        { status: 'complete', answers: [ { grade: 0 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions);

      expect(status.canStartExam).toBe(false);
      expect(status.isMaxAttemptsReached).toBe(true);
      expect(status.attemptsUsed).toBe(2);
      expect(status.effectiveMaxAttempts).toBe(2);
    });

    it('should not activate cool-off timer when all attempts have been used', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (5 * 60 * 1000);
      const exam = { maxAttempts: 2, retakeCooloffMinutes: 60 };
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime - 100000, answers: [ { grade: 0 } ] },
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 0 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, undefined, now);

      expect(status.isMaxAttemptsReached).toBe(true);
      expect(status.isCooloffActive).toBe(false);
      expect(status.cooloffRemainingMs).toBe(0);
      expect(status.canStartExam).toBe(false);
    });

    it('should account for manager extraAttempts when evaluating max attempt limits', () => {
      const exam = { maxAttempts: 2, retakeCooloffHours: 0 };
      const submissions = [
        { status: 'complete', answers: [ { grade: 0 } ] },
        { status: 'complete', answers: [ { grade: 0 } ] }
      ];
      const progressDoc = { extraAttempts: 1 };
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, progressDoc);

      expect(status.canStartExam).toBe(true);
      expect(status.isMaxAttemptsReached).toBe(false);
      expect(status.effectiveMaxAttempts).toBe(3);
      expect(status.attemptsUsed).toBe(2);
    });

    it('should activate cool-off period after a submission when retakeCooloffHours is set', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (2 * 3600000);
      const exam = { maxAttempts: 0, retakeCooloffHours: 12 };
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 1 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, undefined, now);

      expect(status.isCooloffActive).toBe(true);
      expect(status.canStartExam).toBe(false);
      expect(status.cooloffRemainingMs).toBe(10 * 3600000);
      expect(status.cooloffRemainingFormatted).toBe('10h');
    });

    it('should allow exam start once cool-off period expires', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (13 * 3600000);
      const exam = { maxAttempts: 0, retakeCooloffHours: 12 };
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 0 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, undefined, now);

      expect(status.isCooloffActive).toBe(false);
      expect(status.canStartExam).toBe(true);
    });

    it('should calculate cool-off correctly when retakeCooloffMinutes is configured', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (15 * 60 * 1000); // 15 minutes ago
      const exam = { maxAttempts: 0, retakeCooloffMinutes: 45 }; // 45 minutes cool-off
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 0 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, undefined, now);

      expect(status.isCooloffActive).toBe(true);
      expect(status.canStartExam).toBe(false);
      expect(status.cooloffRemainingMs).toBe(30 * 60 * 1000); // 30 minutes remaining
      expect(status.cooloffRemainingFormatted).toBe('30m');
    });

    it('should calculate cool-off correctly for multi-day duration in retakeCooloffMinutes', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (2 * 3600000); // 2 hours ago
      const exam = { maxAttempts: 0, retakeCooloffMinutes: (2 * 1440) }; // 2 days cool-off
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 0 } ] }
      ];
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, undefined, now);

      expect(status.isCooloffActive).toBe(true);
      expect(status.canStartExam).toBe(false);
      expect(status.cooloffRemainingFormatted).toBe('2d');
    });

    it('should clear cool-off lockout when cooloffResetDate is newer than last submission', () => {
      const now = 1000000000;
      const lastAttemptTime = now - (1 * 3600000);
      const exam = { maxAttempts: 0, retakeCooloffHours: 12 };
      const submissions = [
        { status: 'complete', lastUpdateTime: lastAttemptTime, answers: [ { grade: 0 } ] }
      ];
      const progressDoc = { cooloffResetDate: now - (30 * 60 * 1000) };
      const status: RetakePolicyStatus = service.evaluateRetakePolicy(exam, submissions, progressDoc, now);

      expect(status.isCooloffActive).toBe(false);
      expect(status.canStartExam).toBe(true);
    });
  });
});
