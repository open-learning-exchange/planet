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
  const dialogResults: Subject<any>[] = [];
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
    confirm: vi.fn((_title, _fields, formGroup, ..._options) => {
      dialogForms.push(formGroup);
      dialogResults.push(new Subject<any>());
      return dialogResults[dialogResults.length - 1];
    })
  };
  const msg = { showMessage: vi.fn(), showAlert: vi.fn() };
  const loading = { start: vi.fn(), stop: vi.fn() };
  const service = new RatingService(couch as any, user as any, state as any, dialogs as any, msg as any, loading as any);
  const closeDialog = (result: any) => dialogResults[dialogResults.length - 1].next(result);
  return { service, couch, closeDialog, dialogForms, dialogs, loading, msg };
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

  it('opens with the comment disabled and confirms before discarding input', () => {
    const { service, dialogForms, dialogs } = setup();
    service.promptRating(unrated(), 'resource').subscribe();

    expect(dialogForms[0].controls.comment.disabled).toBe(true);
    dialogForms[0].controls.rate.setValue(4);
    expect(dialogForms[0].controls.comment.enabled).toBe(true);
    const [ , , , , confirmUnsavedChanges, actions ] = dialogs.confirm.mock.calls[0];
    expect(confirmUnsavedChanges).toBe(true);
    expect(actions).toEqual({ cancelLabel: 'Not now', submitLabel: 'Done' });
  });

  it('saves the stars and comment once, on Done', () => {
    const { service, couch, closeDialog, dialogForms, msg } = setup();
    const decisions: boolean[] = [];
    const item = unrated({ doc: { title: 'Wrapped resource' }, title: undefined });
    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));

    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.comment.setValue('Useful');
    expect(couch.updateDocument).not.toHaveBeenCalled();
    closeDialog(dialogForms[0].value);

    expect(couch.updateDocument).toHaveBeenCalledTimes(1);
    expect(couch.updateDocument).toHaveBeenCalledWith('ratings', expect.objectContaining({
      item: 'resource-1',
      title: 'Wrapped resource',
      rate: 4,
      comment: 'Useful'
    }));
    expect(couch.findAll).toHaveBeenCalledWith('ratings', expect.any(Object), {});
    expect(item.rating.userRating).toMatchObject({ _id: 'rating-1', rate: 4 });
    expect(msg.showMessage).toHaveBeenCalledWith('Thank you, your rating is submitted!');
    expect(decisions).toEqual([ true ]);
  });

  it('writes nothing when dismissed or done without stars, and suppresses another prompt until the visit is reset', () => {
    const { service, couch, closeDialog, dialogForms, dialogs } = setup();
    const item = unrated();
    const decisions: boolean[] = [];
    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));
    dialogForms[0].controls.rate.setValue(4);
    closeDialog(undefined);

    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));
    expect(dialogs.confirm).toHaveBeenCalledTimes(1);

    service.resetRatingInteraction('resource-1');
    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));
    closeDialog({ rate: 0 });

    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
    expect(couch.updateDocument).not.toHaveBeenCalled();
    expect(decisions).toEqual([ true, true, true ]);
  });

  it('prompts again after a cancelled navigation tears the prompt down', () => {
    const { service, dialogs } = setup();
    const item = unrated();

    service.promptRating(item, 'resource').subscribe().unsubscribe();
    service.promptRating(item, 'resource').subscribe();

    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
  });

  it('reopens with the input kept when the save fails, and Not now still leaves', () => {
    const { service, couch, closeDialog, dialogForms, dialogs, msg } = setup();
    couch.updateDocument.mockReturnValueOnce(throwError(new Error('failed')));
    const decisions: boolean[] = [];
    service.promptRating(unrated(), 'resource').subscribe(decision => decisions.push(decision));
    dialogForms[0].controls.rate.setValue(4);
    dialogForms[0].controls.comment.setValue('Keep this comment');

    closeDialog(dialogForms[0].value);

    expect(msg.showAlert).toHaveBeenCalledWith('There was an issue updating your rating');
    expect(dialogs.confirm).toHaveBeenCalledTimes(2);
    expect(dialogForms[1]).toBe(dialogForms[0]);
    expect(dialogForms[1].getRawValue()).toEqual({ rate: 4, comment: 'Keep this comment' });
    expect(decisions).toEqual([]);

    closeDialog(undefined);

    expect(couch.updateDocument).toHaveBeenCalledTimes(1);
    expect(decisions).toEqual([ true ]);
  });

  it('does not prompt while an inline save for the item is still in flight', () => {
    const { service, dialogs } = setup({ updateResponse: new Subject<any>() });
    const item = unrated();
    const decisions: boolean[] = [];
    service.saveRating({ item, type: 'resource', rate: 4, ratingInfo: item.rating }).subscribe();

    service.promptRating(item, 'resource').subscribe(decision => decisions.push(decision));

    expect(dialogs.confirm).not.toHaveBeenCalled();
    expect(decisions).toEqual([ true ]);
  });
});
