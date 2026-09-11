import { FormBuilder } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { describe, expect, it, vi } from 'vitest';
import { PlanetRatingComponent } from './planet-rating.component';

interface PopupResult {
  rate: number;
  comment: string;
}

const initialRating = () => ({
  rateSum: 8,
  totalRating: 2,
  maleRating: 1,
  femaleRating: 1,
  userRating: {
    _id: 'r-1',
    _rev: '1-a',
    item: 'item-1',
    rate: 5,
    comment: 'Original comment',
    user: { name: 'learner', gender: 'female' }
  },
  allRatings: [
    { _id: 'r-2', rate: 3, user: { name: 'other', gender: 'male' } },
    { _id: 'r-1', rate: 5, comment: 'Original comment', user: { name: 'learner', gender: 'female' } }
  ]
});

const normalizeRatingInfo = (ratingInfo: any = {}) => {
  const allRatings = [ ...(ratingInfo.allRatings || []) ];
  return {
    rateSum: allRatings.reduce((sum, rating) => sum + (rating.rate || 0), 0),
    totalRating: allRatings.length,
    maleRating: allRatings.filter(rating => rating.user?.gender === 'male').length,
    femaleRating: allRatings.filter(rating => rating.user?.gender === 'female').length,
    userRating: ratingInfo.userRating || {},
    allRatings
  };
};

const createComponent = (
  saveResponse?: Observable<any>,
  deleteResponse?: Observable<any>
) => {
  const dialogClosed = new Subject<PopupResult | undefined>();
  const planetMessage = { showMessage: vi.fn(), showAlert: vi.fn() };
  const dialogsForm = { confirm: vi.fn(() => dialogClosed.pipe(take(1))) };
  const ratingService = {
    normalizeRatingInfo: vi.fn(normalizeRatingInfo),
    saveRating: vi.fn().mockImplementation(({ rate, comment, existingRating, ratingInfo }) => {
      if (saveResponse) {
        return saveResponse;
      }
      const savedRating = {
        user: { name: 'learner', gender: 'female' },
        ...existingRating,
        _id: 'r-1',
        _rev: '2-b',
        item: 'item-1',
        rate,
        comment
      };
      const previousIndex = ratingInfo.allRatings.findIndex(rating => rating._id === savedRating._id);
      const allRatings = previousIndex === -1 ?
        [ ...ratingInfo.allRatings, savedRating ] :
        ratingInfo.allRatings.map((rating, index) => index === previousIndex ? savedRating : rating);
      return of(normalizeRatingInfo({ userRating: savedRating, allRatings }));
    }),
    deleteRating: vi.fn().mockImplementation((rating, ratingInfo) => deleteResponse || of(normalizeRatingInfo({
      userRating: {},
      allRatings: ratingInfo.allRatings.filter(itemRating => itemRating._id !== rating._id)
    })))
  };
  const component = new PlanetRatingComponent(
    new FormBuilder().nonNullable,
    planetMessage as any,
    { countInShelf: () => ({ inShelf: true }) } as any,
    dialogsForm as any,
    ratingService as any
  );
  component.item = { _id: 'item-1', title: 'Item' };
  component.ratingType = 'resource';
  component.rating = initialRating();
  component.ngOnChanges();
  return { component, dialogClosed, dialogsForm, planetMessage, ratingService };
};

describe('PlanetRatingComponent', () => {
  it('keeps an auto-saved rating when the dialog is cancelled after clearing', () => {
    const { component, dialogClosed, ratingService } = createComponent();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next(undefined);

    expect(ratingService.saveRating).toHaveBeenCalledTimes(1);
    expect(ratingService.deleteRating).not.toHaveBeenCalled();
    expect(component.isPopupOpen).toBe(false);
    expect(component.rateForm.value).toEqual({ rate: 4 });
    expect(component.popupForm.value).toEqual({ rate: 4, comment: 'Original comment' });
  });

  it('opens the comment dialog again after the previous dialog is dismissed', () => {
    const { component, dialogClosed, dialogsForm, ratingService } = createComponent();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();
    dialogClosed.next(undefined);
    component.rateForm.setValue({ rate: 3 });
    component.onStarClick();

    expect(ratingService.saveRating).toHaveBeenCalledTimes(2);
    expect(dialogsForm.confirm).toHaveBeenCalledTimes(2);
    expect(component.isPopupOpen).toBe(true);
  });

  it('auto-saves an inline rating and updates its displayed aggregates', () => {
    const { component, dialogClosed, ratingService } = createComponent();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();

    expect(ratingService.saveRating).toHaveBeenCalledWith(expect.objectContaining({
      item: component.item,
      type: 'resource',
      rate: 4,
      comment: 'Original comment',
      existingRating: expect.objectContaining({ _id: 'r-1' })
    }));
    expect(component.rating.rateSum).toBe(7);
    expect(component.rating.totalRating).toBe(2);
    dialogClosed.next({ rate: 4, comment: 'Original comment' });
    expect(ratingService.saveRating).toHaveBeenCalledTimes(1);
  });

  it('adds a first rating to the displayed aggregates', () => {
    const { component } = createComponent();
    component.rating = { userRating: {}, allRatings: [] };
    component.ngOnChanges();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();

    expect(component.rating).toMatchObject({
      rateSum: 4,
      totalRating: 1,
      maleRating: 0,
      femaleRating: 1,
      userRating: expect.objectContaining({ rate: 4 })
    });
    expect(component.rating.allRatings).toHaveLength(1);
  });

  it('uses the shared save operation for a changed comment', () => {
    const { component, dialogClosed, planetMessage, ratingService } = createComponent();

    component.onStarClick();
    component.popupForm.controls.comment.setValue('Updated comment');
    dialogClosed.next({ rate: 5, comment: 'Updated comment' });

    expect(ratingService.saveRating).toHaveBeenCalledTimes(1);
    expect(ratingService.saveRating).toHaveBeenCalledWith(expect.objectContaining({ comment: 'Updated comment' }));
    expect(component.rating.userRating.comment).toBe('Updated comment');
    expect(planetMessage.showMessage).toHaveBeenCalledWith('Thank you for your additional comments');
  });

  it('restores the persisted rating when an inline update fails', () => {
    const { component, dialogsForm, ratingService } = createComponent();
    ratingService.saveRating.mockReturnValueOnce(throwError(new Error('update failed')));
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();

    expect(dialogsForm.confirm).not.toHaveBeenCalled();
    expect(component.rating).toEqual(initialRating());
    expect(component.rateForm.value).toEqual({ rate: 5 });
    expect(component.popupForm.value).toEqual({ rate: 5, comment: 'Original comment' });
    expect(component.isPopupOpen).toBe(false);
  });

  it('ignores disabled and zero-value star clicks', () => {
    const { component, dialogsForm, ratingService } = createComponent();
    component.disabled = true;
    component.rateForm.setValue({ rate: 4 });
    component.onStarClick();
    component.disabled = false;
    component.rateForm.setValue({ rate: 0 });
    component.onStarClick();

    expect(ratingService.saveRating).not.toHaveBeenCalled();
    expect(ratingService.deleteRating).not.toHaveBeenCalled();
    expect(dialogsForm.confirm).not.toHaveBeenCalled();
    expect(component.rateForm.value).toEqual({ rate: 5 });
  });

  it('normalizes a missing allRatings collection', () => {
    const { component } = createComponent();
    component.rating = { userRating: {}, allRatings: undefined };

    expect(() => component.ngOnChanges()).not.toThrow();
    expect(component.rating.allRatings).toEqual([]);
    expect(component.rating.totalRating).toBe(0);
  });

  it('uses the shared delete operation and updates displayed aggregates', () => {
    const { component, dialogClosed, planetMessage, ratingService } = createComponent();

    component.onStarClick();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next({ rate: 0, comment: 'Original comment' });

    expect(ratingService.deleteRating).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'r-1' }),
      expect.objectContaining({ totalRating: 2 })
    );
    expect(component.rating).toMatchObject({ rateSum: 3, totalRating: 1, maleRating: 1, femaleRating: 0, userRating: {} });
    expect(component.isPopupOpen).toBe(false);
    expect(planetMessage.showMessage).toHaveBeenCalledWith('Rating removed!');
  });

  it('restores both forms and popup state when deletion fails', () => {
    const { component, dialogClosed, ratingService } = createComponent();
    ratingService.deleteRating.mockReturnValueOnce(throwError(new Error('delete failed')));

    component.onStarClick();
    component.popupForm.setValue({ rate: 0, comment: '' });
    dialogClosed.next({ rate: 0, comment: '' });

    expect(component.rating).toEqual(initialRating());
    expect(component.rateForm.value).toEqual({ rate: 5 });
    expect(component.popupForm.value).toEqual({ rate: 5, comment: 'Original comment' });
    expect(component.isPopupOpen).toBe(false);
  });

  it('resets popup state without deleting when no rating document exists', () => {
    const { component, dialogClosed, ratingService } = createComponent();
    component.rating = { userRating: {}, allRatings: [] };
    component.ngOnChanges();
    component.rateForm.setValue({ rate: 3 });

    component.openDialog();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next({ rate: 0, comment: '' });

    expect(ratingService.deleteRating).not.toHaveBeenCalled();
    expect(component.rateForm.value).toEqual({ rate: 0 });
    expect(component.popupForm.value).toEqual({ rate: 0, comment: '' });
    expect(component.isPopupOpen).toBe(false);
  });
});
