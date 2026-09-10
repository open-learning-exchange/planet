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

  beforeEach(() => {
    couchService = {
      getDocumentByID: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
      updateDocument: vi.fn().mockReturnValue(of({}))
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

  it('submits and releases the loading state for a URL ending in a slash', () => {
    router.url = '/users/';
    directive.addFeedback(post);
    expect(couchService.updateDocument).toHaveBeenCalledOnce();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
  });

  it('uses a textarea and a limited, staged image uploader without writing when the dialog opens', () => {
    directive.openFeedback();

    const [ , fields, controls, options ] = dialogsFormService.openDialogsForm.mock.calls[0];
    expect(fields.find(field => field.name === 'message')).toMatchObject({ type: 'textarea' });
    expect(fields.some(field => field.imageGroup || field.type === 'markdown')).toBe(false);
    expect(fields.find(field => field.name === 'attachments').fileUpload).toMatchObject({
      maxFiles: 3, maxFileSize: 2 * 1024 * 1024, multiple: true, imagePreview: true
    });
    expect(controls.attachments[0]).toEqual({ retained: [], removed: [], added: [] });
    expect(options).toMatchObject({ closeOnSubmit: false, confirmUnsavedChanges: true });
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('saves image bytes and text in one feedback write without persisting temporary upload state', async () => {
    const attachments = {
      retained: [], removed: [],
      added: [ { file: new File([ 'image-bytes' ], 'screen shot.png', { type: 'image/png' }), previewUrl: 'blob:preview' } ]
    };

    directive.addFeedback({ ...post, attachments });
    expect(couchService.updateDocument).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(couchService.updateDocument).toHaveBeenCalledOnce());

    const feedback = couchService.updateDocument.mock.calls.at(-1)[1];
    expect(couchService.updateDocument.mock.calls[0][0]).toBe('feedback');
    expect(feedback.message).toBe(post.message);
    expect(feedback._attachments).toEqual({
      'screenshot-screen_shot.png': { content_type: 'image/png', data: btoa('image-bytes') }
    });
    expect(feedback.messages[0]).toMatchObject({ message: post.message, attachments: [ 'screenshot-screen_shot.png' ] });
    expect(feedback.attachments).toBeUndefined();
    expect(feedback.images).toBeUndefined();
    expect(JSON.stringify(feedback)).not.toContain('blob:');
    expect(dialogsFormService.closeDialogsForm).toHaveBeenCalledOnce();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
  });

  it('keeps the draft and images available after a write failure, then allows retry', async () => {
    const draft = { ...post, attachments: { added: [ { file: new File([ 'image' ], 'screen.png', { type: 'image/png' }) } ] } };
    couchService.updateDocument.mockReturnValueOnce(throwError(new Error('offline')));

    directive.addFeedback(draft);
    await vi.waitFor(() => expect(dialogsLoadingService.stop).toHaveBeenCalledOnce());

    expect(dialogsFormService.closeDialogsForm).not.toHaveBeenCalled();
    expect(dialogsFormService.showErrorMessage.mock.calls.at(-1)[0]).toContain('still here');
    expect(draft.attachments.added).toHaveLength(1);

    directive.addFeedback(draft);
    await vi.waitFor(() => expect(dialogsFormService.closeDialogsForm).toHaveBeenCalledOnce());
    expect(couchService.updateDocument).toHaveBeenCalledTimes(2);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(2);
  });

  it('does not write feedback when an attachment is invalid', () => {
    directive.addFeedback({ ...post, attachments: { added: [ { file: new File([ 'text' ], 'text.txt', { type: 'text/plain' }) } ] } });

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(dialogsFormService.closeDialogsForm).not.toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
  });

  it('ignores a second submission while the first write is in flight', () => {
    const result = new Subject();
    couchService.updateDocument.mockReturnValue(result);

    directive.addFeedback(post);
    directive.addFeedback(post);

    expect(couchService.updateDocument).toHaveBeenCalledOnce();
    result.next({});
    result.complete();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
  });

  it('balances the dialog loading request when a duplicate form submission is ignored', () => {
    const result = new Subject();
    couchService.updateDocument.mockReturnValue(result);
    directive.openFeedback();
    const options = dialogsFormService.openDialogsForm.mock.calls[0][3];

    options.onSubmit(post);
    options.onSubmit(post);
    expect(couchService.updateDocument).toHaveBeenCalledOnce();
    expect(dialogsLoadingService.stop).toHaveBeenCalledOnce();
    result.next({});
    result.complete();
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(2);
  });
});
