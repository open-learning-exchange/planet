import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';

import { ChallengesProgressService } from './challenges-progress.service';
import { ChallengesService } from './challenges.service';

describe('ChallengesProgressService', () => {
  const user = { _id: 'org.couchdb.user:maria', name: 'maria' };
  const day = (date: number, hour = 10) => new Date(2026, 9, date, hour).getTime();
  const voiceTask = { id: 'voice', type: 'voice_post', reward: 2, maxCount: 5 };
  const joinTask = { id: 'join', type: 'course_join', targetId: 'course-1', reward: 1 };
  const surveyTask = { id: 'survey', type: 'survey_complete', targetId: 'survey-1', courseId: 'course-1', reward: 3 };
  let challenge: any;
  let data: Record<string, any[]>;
  let progressDocs: Record<string, any>;
  let couchService: any;
  let userService: any;
  let dialog: any;
  let challengesService: ChallengesService;
  let service: ChallengesProgressService;

  const voice = (_id: string, time: number, extra = {}) =>
    ({ _id, time, user: { name: 'maria' }, viewIn: [ { _id: 'guatemala@earth', section: 'community' } ], ...extra });
  const progress = (_id: string, doc = {}) =>
    ({ _id, challengeId: 'reto', planetCode: 'guatemala', user: 'maria', taskId: 'voice', day: '2026-10-02', ...doc });
  const taskDocIds = () => Object.keys(progressDocs).filter(id => !id.endsWith(':complete'));
  const selectorFor = (db: string) => couchService.findAll.mock.calls.find(([ name ]) => name === db)?.[1].selector;
  const normalized = (tasks: any[]) => challengesService.normalizeChallenge({ ...challenge, tasks });

  beforeEach(() => {
    challenge = { _id: 'reto', type: 'challenge', goal: 500, tasks: [ voiceTask ] };
    data = { news: [], submissions: [], courses_progress: [], shelf: [], courses: [] };
    progressDocs = {};
    couchService = {
      findAll: vi.fn((db: string) => of(data[db])),
      get: vi.fn((url: string, opts: any = {}) => {
        if (url === 'challenge_progress/_all_docs') {
          const [ start, end ] = [ opts.params.startkey, opts.params.endkey ].map(key => JSON.parse(key));
          return of({ rows: Object.values(progressDocs).filter(({ _id }) => _id >= start && _id <= end).map(stored => ({ doc: stored })) });
        }
        if (url.startsWith('challenge_progress/_design')) {
          const rows = Object.values(progressDocs).filter(({ taskId }) => taskId !== 'complete')
            .map(stored => JSON.stringify([ stored.challengeId, stored.planetCode, stored.user, stored.taskId, stored.day ]))
            .reduce((counts, key) => ({ ...counts, [key]: (counts[key] || 0) + 1 }), {});
          return of({ rows: Object.entries(rows).map(([ key, value ]) => ({ key: JSON.parse(key), value })) });
        }
        const [ db, id ] = url.split('/');
        const doc = data[db].find(({ _id }) => _id === id);
        return doc ? of(doc) : throwError({ status: 404 });
      }),
      post: vi.fn((url: string, body: any) => url === 'challenges/_find' ? of({ docs: [ challenge ] }) : of(body.docs.map(doc => {
        if (progressDocs[doc._id]) {
          return { id: doc._id, error: 'conflict' };
        }
        progressDocs[doc._id] = doc;
        return { id: doc._id, ok: true };
      })))
    };
    userService = { get: vi.fn().mockReturnValue(user), doesUserHaveRole: vi.fn().mockReturnValue(false) };
    dialog = { open: vi.fn() };
    const stateService = { configuration: { code: 'guatemala', parentCode: 'earth' } } as any;
    challengesService = new ChallengesService(couchService, new DialogGuardService({ start: vi.fn(), stop: vi.fn() } as any), userService);
    service = new ChallengesProgressService(couchService, stateService, userService, challengesService, dialog);
  });

  it('writes one doc per voice, from any device, and skips replies', () => {
    challenge.tasks = [ { ...voiceTask, countBy: 'day', requiredCount: 2 } ];
    data.news = [ voice('a', day(2, 9)), voice('b', day(2, 15)), voice('reply', day(3), { replyTo: 'a' }) ];

    service.record('voice_post').subscribe();
    service.record('voice_post').subscribe();

    expect(taskDocIds()).toEqual([ 'reto:guatemala:maria:voice:a', 'reto:guatemala:maria:voice:b' ]);
    expect(progressDocs['reto:guatemala:maria:voice:a']).toEqual(expect.objectContaining({ evidence: 'news/a', day: '2026-10-02' }));
  });

  it('applies countBy, the once-only rule, maxCount and requiredCount when reading', () => {
    const docs = [ 2, 2, 3, 4 ].map((date, index) => progress(`${index}`, { day: `2026-10-0${date}` }));
    const voiceProgress = (task: any) => service.userProgress(normalized([ task ]), docs).tasks[0];
    const joinDocs = docs.map(doc => ({ ...doc, taskId: 'join' }));

    expect(voiceProgress({ ...voiceTask, maxCount: 3 })).toEqual(expect.objectContaining({ count: 4, rewarded: 3, earned: 6 }));
    expect(voiceProgress({ ...voiceTask, countBy: 'day' })).toEqual(expect.objectContaining({ count: 3, done: true }));
    expect(voiceProgress({ ...voiceTask, countBy: 'day', requiredCount: 4 }).done).toBe(false);
    expect(service.userProgress(normalized([ joinTask ]), joinDocs).tasks[0]).toEqual(expect.objectContaining({ count: 1, earned: 1 }));
  });

  it('ignores docs in the learner\'s id range that are not theirs', () => {
    progressDocs['reto:guatemala:maria:x:bob:voice'] = progress('reto:guatemala:maria:x:bob:voice', { user: 'bob', planetCode: 'x' });
    progressDocs['reto:guatemala:maria:x:bob:complete'] =
      progress('reto:guatemala:maria:x:bob:complete', { user: 'bob', planetCode: 'x', taskId: 'complete' });
    let result: any;

    service.refresh(normalized([ voiceTask ])).subscribe(refreshed => result = refreshed);

    expect(result.progress).toEqual(expect.objectContaining({ earned: 0, complete: false, succeeded: false }));
  });

  it('queries only the recorded types, for this learner, inside the window and the challenge course', () => {
    challenge = { ...challenge, startsAt: '2026-10-01', endsAt: '2026-10-31', tasks: [ voiceTask, surveyTask ] };
    const window = { $gte: day(1, 0), $lte: new Date(2026, 9, 31, 23, 59, 59, 999).getTime() };
    vi.useFakeTimers({ now: day(15) });
    try {
      service.record('voice_post').subscribe();
      expect(selectorFor('submissions')).toBeUndefined();
      service.record('survey_complete').subscribe();
    } finally {
      vi.useRealTimers();
    }

    expect(selectorFor('news')).toEqual(expect.objectContaining({ 'user.name': 'maria', time: window }));
    expect(selectorFor('submissions')).toEqual(expect.objectContaining({
      'user.name': 'maria', parentId: 'survey-1@course-1', lastUpdateTime: window
    }));
  });

  it('shows success once, whichever task finishes last, and only in the tab that wrote it', () => {
    challenge.tasks = [ joinTask, voiceTask ];
    data.news = [ voice('a', day(2)) ];
    service.record('voice_post').subscribe();
    expect(dialog.open).not.toHaveBeenCalled();

    data.shelf = [ { _id: user._id, courseIds: [ 'course-1' ] } ];
    let completed: boolean;
    service.record('course_join').subscribe(result => completed = result);
    service.record('voice_post').subscribe();

    expect(completed).toBe(true);
    expect(dialog.open).toHaveBeenCalledTimes(1);

    delete progressDocs['reto:guatemala:maria:complete'];
    const post = couchService.post.getMockImplementation();
    couchService.post.mockImplementation((url, body) => body.docs?.[0].taskId === 'complete' ?
      of([ { error: 'conflict' } ]) : post(url, body));
    service.record('voice_post').subscribe(result => completed = result);
    expect(completed).toBe(false);
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('counts a finished course only when every step has passed', () => {
    challenge.tasks = [ { id: 'finish', type: 'course_complete', targetId: 'course-1', reward: 3 } ];
    data.courses = [ { _id: 'course-1', steps: [ {}, {} ] } ];
    data.courses_progress = [ { _id: 'p1', stepNum: 1, passed: true, updatedDate: day(2) } ];
    service.record('course_complete').subscribe();
    expect(taskDocIds()).toEqual([]);

    data.courses_progress.push({ _id: 'p2', stepNum: 2, passed: true, updatedDate: day(4) });
    service.record('course_complete').subscribe();
    expect(Object.values(progressDocs)[0]).toEqual(expect.objectContaining({ evidence: 'courses_progress/p2' }));
  });

  it('writes nothing for managers', () => {
    userService.doesUserHaveRole.mockImplementation((roles: string[]) => roles.includes('manager'));
    data.news = [ voice('a', day(2)) ];
    let completed: boolean;

    service.record('voice_post').subscribe(result => completed = result);

    expect(completed).toBe(false);
    expect(couchService.post).not.toHaveBeenCalled();
  });

  it('totals the planet per learner and planet, capped at the goal', () => {
    [ 'a', 'b', 'c', 'd', 'e', 'f', 'g' ].forEach(id => progressDocs[id] = progress(id));
    progressDocs.h = progress('h', { planetCode: 'nepal' });
    progressDocs.i = progress('i', { taskId: 'join' });
    progressDocs.j = progress('j', { taskId: 'join' });
    let earned: number;

    service.groupEarned(normalized([ voiceTask, joinTask ])).subscribe(result => earned = result);
    expect(earned).toBe((5 + 1) * 2 + 1);

    service.groupEarned({ ...normalized([ voiceTask, joinTask ]), goal: 4 }).subscribe(result => earned = result);
    expect(earned).toBe(4);
  });
});
