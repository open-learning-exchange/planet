import { Observable, of, throwError } from 'rxjs';
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

const setup = ({ updateResponse }: { updateResponse?: Observable<any> } = {}) => {
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
  const user = { get: () => ({ _id: 'u-1', name: 'tester', gender: 'female' }) };
  const state = { configuration: { code: 'c1', parentCode: 'p1', parentDomain: 'dom' } };
  const msg = { showMessage: vi.fn(), showAlert: vi.fn() };
  const loading = { start: vi.fn(), stop: vi.fn() };
  const service = new RatingService(couch as any, user as any, state as any, msg as any, loading as any);
  return { service, couch, loading, msg };
};

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
