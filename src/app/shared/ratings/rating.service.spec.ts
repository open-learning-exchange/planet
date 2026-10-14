import { FormGroup } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { RatingService } from './rating.service';

const startingRating = () => ({
  rateSum: 3,
  totalRating: 1,
  maleRating: 1,
  femaleRating: 0,
  userRating: {},
  allRatings: [ { _id: 'other', rate: 3, user: { name: 'other', gender: 'male' } } ]
});

const setup = ({ inShelf = true, updateResponse }: { inShelf?: boolean, updateResponse?: Observable<any> } = {}) => {
  const dialogClosed = new Subject<any>();
  const dialogForms: FormGroup[] = [];
  const couch = {
    findAll: vi.fn().mockReturnValue(of([])),
    updateDocument: vi.fn().mockImplementation((_db, doc) => updateResponse || of({
      id: doc._id || 'rating-1',
      rev: '2-b',
      doc: { ...doc, _id: doc._id || 'rating-1', _rev: '2-b' }
    })),
    delete: vi.fn().mockReturnValue(of({ ok: true })),
    datePlaceholder: 'DATE'
  };
  const user = {
    get: () => ({ _id: 'u-1', name: 'tester', gender: 'female' }),
    countInShelf: () => ({ inShelf: inShelf ? 1 : 0 })
  };
  const state = { configuration: { code: 'c1', parentCode: 'p1', parentDomain: 'dom' } };
  const dialogs = {
    confirm: vi.fn((_title, _fields, formGroup) => {
      dialogForms.push(formGroup);
      return dialogClosed;
    })
  };
  const msg = { showMessage: vi.fn(), showAlert: vi.fn() };
  const loading = { start: vi.fn(), stop: vi.fn() };
  const service = new RatingService(couch as any, user as any, state as any, dialogs as any, msg as any, loading as any);
  return { service, couch, dialogClosed, dialogForms, dialogs, loading, msg };
};

const unrated = (extra = {}) => ({ _id: 'resource-1', title: 'Resource', rating: { userRating: {}, allRatings: [] }, ...extra });

describe('RatingService persistence', () => {
  it('saves a resource wrapper title and returns complete aggregates', () => {
    const { service, couch, loading } = setup();
    let result: any;

    service.saveRating({
      item: { _id: 'resource-1', doc: { title: 'Wrapped resource' } },
      type: 'resource',
      rate: 5,
      comment: '',
      ratingInfo: startingRating()
    }).subscribe(ratingInfo => result = ratingInfo);

    expect(couch.updateDocument).toHaveBeenCalledWith('ratings', expect.objectContaining({
      item: 'resource-1',
      title: 'Wrapped resource',
      rate: 5
    }));
    expect(result).toMatchObject({ rateSum: 8, totalRating: 2, maleRating: 1, femaleRating: 1 });
    expect(result.allRatings).toHaveLength(2);
    expect(result.userRating).toMatchObject({ _id: 'rating-1', rate: 5 });
    expect(couch.findAll).toHaveBeenCalledWith('ratings', expect.any(Object), {});
    expect(loading.start).toHaveBeenCalledTimes(1);
    expect(loading.stop).toHaveBeenCalledTimes(1);
  });

  it('updates the existing rating instead of adding another aggregate entry', () => {
    const { service, couch } = setup();
    const existingRating = {
      _id: 'rating-1',
      _rev: '1-a',
      item: 'course-1',
      rate: 4,
      comment: '',
      user: { name: 'tester', gender: 'female' }
    };
    let result: any;

    service.saveRating({
      item: { _id: 'course-1', courseTitle: 'Course' },
      type: 'course',
      rate: 4,
      comment: 'Useful',
      existingRating,
      ratingInfo: { userRating: existingRating, allRatings: [ startingRating().allRatings[0], existingRating ] }
    }).subscribe(ratingInfo => result = ratingInfo);

    expect(couch.updateDocument).toHaveBeenCalledWith('ratings', expect.objectContaining({
      _id: 'rating-1',
      title: 'Course',
      comment: 'Useful'
    }));
    expect(result.allRatings).toHaveLength(2);
    expect(result.userRating.comment).toBe('Useful');
  });

  it('keeps the stored comment when a save omits one', () => {
    const { service, couch } = setup();
    const existingRating = { _id: 'rating-1', _rev: '1-a', item: 'resource-1', rate: 4, comment: 'Still useful' };

    service.saveRating({
      item: { _id: 'resource-1', title: 'Resource' },
      type: 'resource',
      rate: 5,
      existingRating
    }).subscribe();

    expect(couch.updateDocument).toHaveBeenCalledWith('ratings', expect.objectContaining({
      rate: 5,
      comment: 'Still useful'
    }));
  });

  it('deletes a rating and returns the remaining aggregates', () => {
    const { service, couch } = setup();
    const rating = { _id: 'rating-1', _rev: '1-a', item: 'resource-1', rate: 5, user: { gender: 'female' } };
    let result: any;

    service.deleteRating(rating, {
      userRating: rating,
      allRatings: [ startingRating().allRatings[0], rating ]
    }).subscribe(ratingInfo => result = ratingInfo);

    expect(couch.delete).toHaveBeenCalledWith('ratings/rating-1?rev=1-a');
    expect(result).toMatchObject({ rateSum: 3, totalRating: 1, maleRating: 1, femaleRating: 0, userRating: {} });
  });

  it('reports save failures and always stops loading', () => {
    const { service, loading, msg } = setup({ updateResponse: throwError(new Error('failed')) });
    let error: unknown;

    service.saveRating({ item: { _id: 'resource-1', title: 'Resource' }, type: 'resource', rate: 4 })
      .subscribe({ error: saveError => error = saveError });

    expect(error).toBeInstanceOf(Error);
    expect(msg.showAlert).toHaveBeenCalledWith('There was an issue updating your rating');
    expect(loading.stop).toHaveBeenCalledTimes(1);
  });

  it('reports delete failures and always stops loading', () => {
    const { service, couch, loading, msg } = setup();
    couch.delete.mockReturnValueOnce(throwError(new Error('failed')));
    let error: unknown;

    service.deleteRating({ _id: 'rating-1', _rev: '1-a', item: 'resource-1' })
      .subscribe({ error: deleteError => error = deleteError });

    expect(error).toBeInstanceOf(Error);
    expect(msg.showAlert).toHaveBeenCalledWith('There was an issue updating your rating');
    expect(loading.stop).toHaveBeenCalledTimes(1);
  });
});

describe('RatingService promptRating', () => {
  it('prompts only for an unrated shelf member', () => {
    const eligible = setup();
    eligible.service.promptRating(unrated(), 'resource').subscribe();
    expect(eligible.dialogs.confirm).toHaveBeenCalledTimes(1);

    const notInShelf = setup({ inShelf: false });
    notInShelf.service.promptRating(unrated(), 'resource').subscribe();
    expect(notInShelf.dialogs.confirm).not.toHaveBeenCalled();

    const rated = setup();
    rated.service.promptRating(unrated({ rating: { userRating: { rate: 4 } } }), 'resource').subscribe();
    expect(rated.dialogs.confirm).not.toHaveBeenCalled();
  });

  it('opens with the comment disabled and enables it on the first star', () => {
    const { service, dialogForms, dialogs } = setup();
    service.promptRating(unrated(), 'resource').subscribe();

    expect(dialogForms[0].controls.comment.disabled).toBe(true);
    dialogForms[0].controls.rate.setValue(4);
    expect(dialogForms[0].controls.comment.enabled).toBe(true);
    const actions = dialogs.confirm.mock.calls[0][5];
    expect(actions).toMatchObject({ cancelLabel: 'Not now', submitLabel: 'Done' });
    expect(actions.hideCancel({ rate: 0 })).toBe(false);
    expect(actions.hideCancel({ rate: 4 })).toBe(true);
  });

  it('auto-saves stars and updates the same rating with a submitted comment', () => {
    const { service, couch, dialogClosed, dialogForms, loading, msg } = setup();
    const decisions: boolean[] = [];
    service.promptRating(unrated({ doc: { title: 'Wrapped resource' }, title: undefined }), 'resource')
      .subscribe(decision => decisions.push(decision));

    dialogForms[0].controls.rate.setValue(4);
    expect(couch.updateDocument).toHaveBeenCalledTimes(1);
    expect(loading.start).not.toHaveBeenCalled();
    expect(couch.updateDocument).toHaveBeenLastCalledWith('ratings', expect.objectContaining({
      title: 'Wrapped resource',
      rate: 4,
      comment: ''
    }));
    expect(couch.findAll).toHaveBeenCalledWith('ratings', expect.any(Object), {});

    dialogForms[0].controls.comment.setValue('Useful');
    dialogClosed.next(dialogForms[0].value);

    expect(couch.updateDocument).toHaveBeenCalledTimes(2);
    expect(couch.updateDocument).toHaveBeenLastCalledWith('ratings', expect.objectContaining({
      _id: 'rating-1',
      rate: 4,
      comment: 'Useful'
    }));
    expect(msg.showMessage).toHaveBeenCalledWith('Thank you for your additional comments');
    expect(decisions).toEqual([ true ]);
  });

  it('suppresses another prompt after dismissal until the visit is reset', () => {
    const { service, dialogClosed, dialogs } = setup();
    const item = unrated();
    service.promptRating(item, 'resource').subscribe();
    dialogClosed.next(undefined);

    service.promptRating(item, 'resource').subscribe();
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);

    service.resetRatingInteraction('resource-1');
    service.promptRating(item, 'resource').subscribe();
    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
  });

  it('makes a replacement prompt wait for a write its torn-down predecessor started', () => {
    const pending = new Subject<any>();
    const { service, couch, dialogForms, dialogs } = setup({ updateResponse: pending });
    const item = unrated();
    const first = service.promptRating(item, 'resource').subscribe();
    dialogForms[0].controls.rate.setValue(4);
    first.unsubscribe();
    const decisions: boolean[] = [];

    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
    pending.next({ id: 'rating-1', rev: '2-b', doc: { _id: 'rating-1', _rev: '2-b', item: 'resource-1', rate: 4 } });
    pending.complete();

    expect(couch.updateDocument).toHaveBeenCalledTimes(1);
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
    expect(decisions).toEqual([ true ]);
  });

  it('prompts again after a cancelled navigation tears the prompt down', () => {
    const { service, dialogs } = setup();
    const item = unrated();

    service.promptRating(item, 'resource').subscribe().unsubscribe();
    service.promptRating(item, 'resource').subscribe();

    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
  });

  it('reopens the prompt with its input when a comment update fails', () => {
    const { service, couch, dialogClosed, dialogForms, dialogs, msg } = setup();
    const decisions: boolean[] = [];
    service.promptRating(unrated(), 'resource').subscribe(decision => decisions.push(decision));
    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.comment.setValue('Keep this comment');
    couch.updateDocument.mockReturnValueOnce(throwError(new Error('failed')));

    dialogClosed.next(dialogForms[0].value);

    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
    expect(dialogForms[1]).toBe(dialogForms[0]);
    expect(dialogForms[1].controls.comment.value).toBe('Keep this comment');
    expect(msg.showAlert).toHaveBeenCalled();
    expect(decisions).toEqual([]);
  });

  it('retries the same star after a failed save', () => {
    const { service, couch, dialogForms } = setup();
    couch.updateDocument.mockReturnValueOnce(throwError(new Error('failed')));
    service.promptRating(unrated(), 'resource').subscribe();

    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.rate.setValue(4);

    expect(couch.updateDocument).toHaveBeenCalledTimes(2);
  });

  it('drops a star change made mid-save and reconciles it on submit', () => {
    const pending = new Subject<any>();
    const { service, couch, dialogClosed, dialogForms } = setup({ updateResponse: pending });
    service.promptRating(unrated(), 'resource').subscribe();

    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.rate.setValue(5);

    expect(couch.updateDocument).toHaveBeenCalledTimes(1);
    pending.next({ id: 'rating-1', rev: '2-b', doc: { _id: 'rating-1', _rev: '2-b', rate: 4, comment: '' } });
    pending.complete();

    dialogClosed.next(dialogForms[0].value);
    expect(couch.updateDocument).toHaveBeenCalledTimes(2);
    expect(couch.updateDocument).toHaveBeenLastCalledWith('ratings', expect.objectContaining({ _id: 'rating-1', rate: 5 }));
  });

  it('saves a star change dropped mid-save when the prompt is dismissed', () => {
    const pending = new Subject<any>();
    const { service, couch, dialogClosed, dialogForms } = setup({ updateResponse: pending });
    service.promptRating(unrated(), 'resource').subscribe();
    dialogForms[0].controls.rate.setValue(3);
    dialogForms[0].controls.comment.setValue('Unsaved');
    dialogForms[0].controls.rate.setValue(5);
    pending.next({ id: 'rating-1', rev: '2-b', doc: { _id: 'rating-1', _rev: '2-b', rate: 3, comment: '' } });
    pending.complete();

    dialogClosed.next(undefined);

    expect(couch.updateDocument).toHaveBeenLastCalledWith('ratings', expect.objectContaining({ _id: 'rating-1', rate: 5, comment: '' }));
  });

  it('lets the learner leave when the save on dismissal fails', () => {
    const { service, dialogClosed, dialogForms, dialogs, msg } = setup({ updateResponse: throwError(new Error('failed')) });
    const decisions: boolean[] = [];
    service.promptRating(unrated(), 'resource').subscribe(decision => decisions.push(decision));
    dialogForms[0].controls.rate.setValue(4);

    dialogClosed.next(undefined);

    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
    expect(msg.showAlert).toHaveBeenCalled();
    expect(decisions).toEqual([ true ]);
  });

  it('keeps a failed clear and retries the delete on Done', () => {
    const { service, couch, dialogClosed, dialogForms } = setup();
    couch.delete.mockReturnValueOnce(throwError(new Error('failed')));
    const decisions: boolean[] = [];
    service.promptRating(unrated(), 'resource').subscribe(decision => decisions.push(decision));
    dialogForms[0].controls.rate.setValue(4);

    dialogForms[0].controls.rate.setValue(0);
    expect(dialogForms[0].controls.rate.value).toBe(0);
    dialogClosed.next(dialogForms[0].value);

    expect(couch.delete).toHaveBeenCalledTimes(2);
    expect(decisions).toEqual([ true ]);
  });

  it('waits for a pending inline save before deciding whether to prompt', () => {
    const pending = new Subject<any>();
    const { service, dialogs } = setup({ updateResponse: pending });
    const item = unrated();
    const decisions: boolean[] = [];
    service.saveRating({ item, type: 'resource', rate: 4, ratingInfo: item.rating }).subscribe();

    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));
    expect(dialogs.confirm).not.toHaveBeenCalled();
    pending.next({ id: 'rating-1', rev: '1-a', doc: { _id: 'rating-1', _rev: '1-a', item: 'resource-1', rate: 4 } });
    pending.complete();

    expect(dialogs.confirm).not.toHaveBeenCalled();
    expect(decisions).toEqual([ true ]);
  });

  it('keeps waiting on a retry started when the write it replaced failed', () => {
    const first = new Subject<any>();
    const retry = new Subject<any>();
    const { service, couch, dialogClosed, dialogForms, dialogs } = setup();
    couch.updateDocument.mockReturnValueOnce(first).mockReturnValueOnce(retry);
    const item = unrated();
    const prompt = service.promptRating(item, 'resource').subscribe();
    dialogForms[0].controls.rate.setValue(4);
    dialogClosed.next(dialogForms[0].value);
    first.error(new Error('failed'));
    prompt.unsubscribe();

    service.promptRating(item, 'resource').subscribe();
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
    retry.next({ id: 'rating-1', rev: '1-a', doc: { _id: 'rating-1', _rev: '1-a', item: 'resource-1', rate: 4 } });
    retry.complete();

    expect(couch.updateDocument).toHaveBeenCalledTimes(2);
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
  });

  it('deletes a held-back clear when browser back closes the dialog and then tears the prompt down', () => {
    const pending = new Subject<any>();
    const { service, couch, dialogClosed, dialogForms } = setup({ updateResponse: pending });
    const prompt = service.promptRating(unrated(), 'resource').subscribe();
    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.rate.setValue(0);
    dialogClosed.next(undefined);
    prompt.unsubscribe();

    pending.next({ id: 'rating-1', rev: '2-b', doc: { _id: 'rating-1', _rev: '2-b', item: 'resource-1', rate: 4 } });
    pending.complete();

    expect(couch.delete).toHaveBeenCalledTimes(1);
    expect(couch.delete).toHaveBeenCalledWith('ratings/rating-1?rev=2-b');
  });

  it('deletes a rating cleared while its save was still pending', () => {
    const pending = new Subject<any>();
    const { service, couch, dialogClosed, dialogForms } = setup({ updateResponse: pending });
    service.promptRating(unrated(), 'resource').subscribe();

    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.rate.setValue(0);
    pending.next({ id: 'rating-1', rev: '2-b', doc: { _id: 'rating-1', _rev: '2-b', item: 'resource-1', rate: 4 } });
    pending.complete();
    expect(couch.delete).not.toHaveBeenCalled();

    dialogClosed.next(undefined);

    expect(couch.delete).toHaveBeenCalledWith('ratings/rating-1?rev=2-b');
  });

  it('deletes a cleared prompt rating and suppresses another prompt', () => {
    const { service, couch, dialogForms, dialogClosed, dialogs } = setup();
    const item = unrated();
    service.promptRating(item, 'resource').subscribe();
    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.comment.setValue('Nice');
    dialogForms[0].controls.rate.setValue(0);
    dialogClosed.next(undefined);

    expect(couch.delete).toHaveBeenCalledWith('ratings/rating-1?rev=2-b');
    expect(dialogForms[0].controls.comment.disabled).toBe(true);
    service.promptRating(item, 'resource').subscribe();
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);
  });
});
