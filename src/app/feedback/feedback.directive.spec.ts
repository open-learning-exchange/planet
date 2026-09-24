import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { urlToParamObject } from '../shared/utils';
import { FeedbackDirective } from './feedback.directive';

describe('FeedbackDirective', () => {
  let couchService: any;
  let directive: FeedbackDirective;
  let router: any;
  let dialogsFormService: any;
  let dialogsLoadingService: any;

  const post = {
    message: 'Feedback message',
    priority: 'yes',
    type: 'bug'
  };
  const screenshot = (name = 'screen shot.png') => ({ file: new File([ 'image' ], name, { type: 'image/png' }) });

  beforeEach(() => {
    couchService = {
      getDocumentByID: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
      updateDocument: vi.fn().mockReturnValue(of({})),
      putAttachment: vi.fn()
    };
    router = { url: '/' };
    dialogsFormService = { openDialogsForm: vi.fn(), closeDialogsForm: vi.fn(), showErrorMessage: vi.fn() };
    dialogsLoadingService = { stop: vi.fn() };
    directive = new FeedbackDirective(
      { get: () => ({ name: 'tester' }) } as any,
      couchService,
      dialogsFormService,
      router,
      { setFeedback: vi.fn() } as any,
      { showMessage: vi.fn(), showAlert: vi.fn() } as any,
      { configuration: { code: 'planet', parentCode: 'nation' } } as any,
      {} as any,
      dialogsLoadingService
    );
  });

  it('stores matrix parameters in the feedback URL', () => {
    router.url = '/users/profile/a;planet=mutugi';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users/profile/a;planet=mutugi');
  });

  it('stores matrix parameters in intermediate path segments', () => {
    router.url = '/users;planet=mutugi/profile/a';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users;planet=mutugi/profile/a');
    expect(feedback.state).toBe('users');
    expect(feedback.routerLink).toEqual([ '/', 'users', 'profile', 'a' ]);
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

  it('treats a trailing slash like the same route without it', () => {
    router.url = '/users/';

    directive.addFeedback(post);

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(feedback.url).toBe('/users/');
    expect(feedback.routerLink).toEqual([ '/', 'users' ]);
    expect(feedback.titleContext).toEqual({ kind: 'section', state: 'users' });
  });

  it('saves the feedback, then uploads each screenshot against the latest revision', async () => {
    couchService.updateDocument.mockReturnValue(of({ id: 'feedback-1', rev: '1-a' }));
    couchService.putAttachment.mockReturnValueOnce(of({ rev: '2-b' })).mockReturnValueOnce(of({ rev: '3-c' }));

    directive.addFeedback({ ...post, attachments: { retained: [], removed: [], added: [ screenshot(), screenshot() ] } });
    await vi.waitFor(() => expect(dialogsFormService.closeDialogsForm).toHaveBeenCalledOnce());

    const feedback = couchService.updateDocument.mock.calls[0][1];
    expect(feedback.attachments).toBeUndefined();
    expect(feedback.messages[0].attachments).toEqual([ 'screen_shot.png', 'screen_shot-1.png' ]);
    expect(couchService.putAttachment.mock.calls.map(([ path ]) => path)).toEqual([
      'feedback/feedback-1/screen_shot.png?rev=1-a',
      'feedback/feedback-1/screen_shot-1.png?rev=2-b'
    ]);
  });

  it('warns when the feedback is saved but a screenshot upload fails', async () => {
    couchService.updateDocument.mockReturnValue(of({ id: 'feedback-1', rev: '1-a' }));
    couchService.putAttachment.mockReturnValueOnce(throwError(new Error('offline'))).mockReturnValueOnce(of({ rev: '2-b' }));

    directive.addFeedback({ ...post, attachments: { added: [ screenshot('a.png'), screenshot('b.png') ] } });
    await vi.waitFor(() => expect(dialogsFormService.closeDialogsForm).toHaveBeenCalledOnce());

    expect(couchService.putAttachment.mock.calls[1][0]).toBe('feedback/feedback-1/b.png?rev=1-a');
    expect((directive as any).planetMessageService.showAlert).toHaveBeenCalledWith(expect.stringContaining('could not be included'));
  });

  it('submits feedback without a screenshot that cannot be normalized', async () => {
    const originalImage = window.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    class ErrorImage {
      onerror: () => void = () => {};

      set src(_value: string) {
        setTimeout(() => this.onerror());
      }
    }
    (window as any).Image = ErrorImage;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:screenshot');
    URL.revokeObjectURL = vi.fn();
    couchService.updateDocument.mockReturnValue(of({ id: 'feedback-1', rev: '1-a' }));
    couchService.putAttachment.mockReturnValue(of({ rev: '2-b' }));

    try {
      const large = { file: new File([ new Uint8Array(2 * 1024 * 1024 + 1) ], 'bad.png', { type: 'image/png' }) };
      directive.addFeedback({ ...post, attachments: { added: [ large, screenshot('good.png') ] } });
      await vi.waitFor(() => expect(dialogsFormService.closeDialogsForm).toHaveBeenCalledOnce());

      const feedback = couchService.updateDocument.mock.calls[0][1];
      expect(feedback.messages[0].attachments).toEqual([ 'good.png' ]);
      expect(couchService.putAttachment.mock.calls.map(([ path ]) => path)).toEqual([
        'feedback/feedback-1/good.png?rev=1-a'
      ]);
      expect((directive as any).planetMessageService.showAlert).toHaveBeenCalledWith(
        expect.stringContaining('could not be included')
      );
    } finally {
      (window as any).Image = originalImage;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it('keeps the dialog open with an error when the feedback cannot be saved', () => {
    couchService.updateDocument.mockReturnValue(throwError(new Error('offline')));

    directive.addFeedback(post);

    expect(dialogsFormService.closeDialogsForm).not.toHaveBeenCalled();
    expect(dialogsFormService.showErrorMessage).toHaveBeenLastCalledWith(expect.stringContaining('could not be submitted'));
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
  });

  it('balances the dialog loading request when a duplicate form submission is ignored', () => {
    const result = new Subject();
    couchService.updateDocument.mockReturnValue(result);
    directive.openFeedback();
    const { onSubmit } = dialogsFormService.openDialogsForm.mock.calls[0][3];

    onSubmit(post);
    onSubmit(post);
    expect(couchService.updateDocument).toHaveBeenCalledOnce();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
    result.next({});
    result.complete();
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(2);
  });
});
