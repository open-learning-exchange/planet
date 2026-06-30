import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { urlToParamObject } from '../shared/utils';
import { FeedbackDirective } from './feedback.directive';

describe('FeedbackDirective', () => {
  let couchService: any;
  let directive: FeedbackDirective;
  let router: any;

  const post = {
    message: 'Feedback message',
    priority: 'yes',
    type: 'bug'
  };

  beforeEach(() => {
    couchService = {
      getDocumentByID: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
      updateDocument: vi.fn().mockReturnValue(of({}))
    };
    router = { url: '/' };
    directive = new FeedbackDirective(
      { get: () => ({ name: 'tester' }) } as any,
      couchService,
      {} as any,
      router,
      { setFeedback: vi.fn() } as any,
      { showMessage: vi.fn(), showAlert: vi.fn() } as any,
      { configuration: { code: 'planet', parentCode: 'nation' } } as any,
      {} as any
    );
  });

  it('stores matrix parameters in the feedback URL', () => {
    router.url = '/users/profile/a;planet=mutugi';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users/profile/a;planet=mutugi');
  });

  it('keeps page parameters parseable from the stored URL', () => {
    router.url = '/users/profile/a;planet=mutugi';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(urlToParamObject(feedback.url)).toEqual({ planet: 'mutugi' });
  });

  it('uses parameter-free values for navigation metadata', () => {
    router.url = '/users/profile/a;planet=mutugi';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.state).toBe('users');
    expect(feedback.routerLink).toEqual([ '/', 'users', 'profile', 'a' ]);
    expect(feedback.titleContext).toEqual({ kind: 'path', path: [ 'users', 'profile', 'a' ] });
  });

  it('stores query parameters while keeping navigation metadata parameter-free', () => {
    router.url = '/users?search=mutugi';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users?search=mutugi');
    expect(feedback.state).toBe('users');
    expect(feedback.routerLink).toEqual([ '/', 'users' ]);
    expect(feedback.titleContext).toEqual({ kind: 'section', state: 'users' });
  });

  it('behaves the same for routes without matrix parameters', () => {
    router.url = '/users/profile/a';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users/profile/a');
    expect(feedback.state).toBe('users');
    expect(feedback.routerLink).toEqual([ '/', 'users', 'profile', 'a' ]);
    expect(feedback.titleContext).toEqual({ kind: 'path', path: [ 'users', 'profile', 'a' ] });
  });

  it('behaves the same for the home route', () => {
    router.url = '/';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/');
    expect(feedback.state).toBe('home');
    expect(feedback.routerLink).toEqual([ '/home' ]);
    expect(feedback.titleContext).toEqual({ kind: 'home' });
  });
});
