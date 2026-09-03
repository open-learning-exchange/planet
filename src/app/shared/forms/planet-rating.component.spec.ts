import { FormBuilder } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
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
    rate: 5,
    comment: 'Original comment',
    user: { name: 'learner', gender: 'female' }
  },
  allRatings: [
    { _id: 'r-2', rate: 3, user: { name: 'other', gender: 'male' } },
    { _id: 'r-1', rate: 5, comment: 'Original comment', user: { name: 'learner', gender: 'female' } }
  ]
});

const createComponent = (
  deleteResponse: Observable<unknown> = of({ ok: true }),
  updateResponse: Observable<unknown> = of({ id: 'r-1', rev: '2-b' })
) => {
  const dialogClosed = new Subject<PopupResult | undefined>();
  const couchService = {
    datePlaceholder: 'now',
    delete: vi.fn().mockReturnValue(deleteResponse),
    updateDocument: vi.fn().mockReturnValue(updateResponse)
  };
  const planetMessage = { showMessage: vi.fn(), showAlert: vi.fn() };
  const dialogsForm = { confirm: vi.fn().mockReturnValue(dialogClosed.asObservable()) };
  const dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
  const ratingService = { newRatings: vi.fn() };
  const component = new PlanetRatingComponent(
    new FormBuilder().nonNullable,
    couchService as any,
    planetMessage as any,
    {
      countInShelf: () => ({ inShelf: true }),
      get: () => ({ name: 'learner', gender: 'female' })
    } as any,
    dialogsForm as any,
    dialogsLoadingService as any,
    ratingService as any,
    { configuration: { code: 'planet', parentCode: 'parent' } } as any
  );
  component.item = { _id: 'item-1', title: 'Item' };
  component.ratingType = 'resource';
  component.rating = initialRating();
  component.ngOnChanges();
  return { component, couchService, dialogClosed, dialogsForm, dialogsLoadingService, planetMessage, ratingService };
};

describe('PlanetRatingComponent rating clearing', () => {
  it('keeps an auto-saved rating when the dialog is cancelled after clearing', () => {
    const { component, couchService, dialogClosed } = createComponent();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next(undefined);

    expect(couchService.updateDocument).toHaveBeenCalledTimes(1);
    expect(couchService.delete).not.toHaveBeenCalled();
    expect(component.isPopupOpen).toBe(false);
    expect(component.rateForm.value).toEqual({ rate: 4 });
    expect(component.popupForm.value).toEqual({ rate: 4, comment: 'Original comment' });
  });

  it('auto-saves an inline rating and does not resubmit an unchanged dialog', () => {
    const { component, couchService, dialogClosed, dialogsLoadingService } = createComponent();
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();
    expect(couchService.updateDocument).toHaveBeenCalledTimes(1);
    expect(component.rating.rateSum).toBe(7);
    expect(component.rating.totalRating).toBe(2);
    expect(component.rateForm.value).toEqual({ rate: 4 });

    dialogClosed.next({ rate: 4, comment: 'Original comment' });

    expect(couchService.updateDocument).toHaveBeenCalledTimes(1);
    expect(couchService.delete).not.toHaveBeenCalled();
    expect(dialogsLoadingService.start).toHaveBeenCalledTimes(1);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });

  it('writes changed dialog comments without rewriting an unchanged inline rating first', () => {
    const { component, couchService, dialogClosed, planetMessage } = createComponent();

    component.onStarClick();
    expect(couchService.updateDocument).not.toHaveBeenCalled();

    component.popupForm.controls.comment.setValue('Updated comment');
    dialogClosed.next({ rate: 5, comment: 'Updated comment' });

    expect(couchService.updateDocument).toHaveBeenCalledTimes(1);
    expect(component.rating.userRating.comment).toBe('Updated comment');
    expect(planetMessage.showMessage).toHaveBeenCalledWith('Thank you for your additional comments');
  });

  it('restores the persisted rating when an inline update fails', () => {
    const { component, dialogsForm, dialogsLoadingService, planetMessage } = createComponent(
      of({ ok: true }),
      throwError(new Error('update failed'))
    );
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();

    expect(dialogsForm.confirm).not.toHaveBeenCalled();
    expect(component.rating).toEqual(initialRating());
    expect(component.rateForm.value).toEqual({ rate: 5 });
    expect(component.popupForm.value).toEqual({ rate: 5, comment: 'Original comment' });
    expect(component.isPopupOpen).toBe(false);
    expect(planetMessage.showAlert).toHaveBeenCalledWith('There was an issue updating your rating');
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks on a disabled rating and restores its displayed value', () => {
    const { component, couchService, dialogsForm, planetMessage } = createComponent();
    component.disabled = true;
    component.rateForm.setValue({ rate: 4 });

    component.onStarClick();

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(couchService.delete).not.toHaveBeenCalled();
    expect(dialogsForm.confirm).not.toHaveBeenCalled();
    expect(planetMessage.showMessage).not.toHaveBeenCalled();
    expect(component.rateForm.value).toEqual({ rate: 5 });
  });

  it('does not delete when a widget click occurs with a zero form value', () => {
    const { component, couchService, dialogsForm } = createComponent();
    component.rateForm.setValue({ rate: 0 });

    component.onStarClick();

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(couchService.delete).not.toHaveBeenCalled();
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

  it('deletes the rating and updates the displayed aggregates after confirmation', () => {
    const { component, couchService, dialogClosed, dialogsLoadingService, planetMessage, ratingService } = createComponent();

    component.onStarClick();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next({ rate: 0, comment: 'Original comment' });

    expect(couchService.delete).toHaveBeenCalledWith('ratings/r-1?rev=1-a');
    expect(component.rating).toMatchObject({
      rateSum: 3,
      totalRating: 1,
      maleRating: 1,
      femaleRating: 0,
      userRating: {}
    });
    expect(component.rating.allRatings).toEqual([ initialRating().allRatings[0] ]);
    expect(component.rateForm.value).toEqual({ rate: 0 });
    expect(component.popupForm.value).toEqual({ rate: 0, comment: '' });
    expect(component.isPopupOpen).toBe(false);
    expect(ratingService.newRatings).toHaveBeenCalledWith(false);
    expect(planetMessage.showMessage).toHaveBeenCalledWith('Rating removed!');
    expect(dialogsLoadingService.start).toHaveBeenCalledTimes(1);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });

  it('restores both forms and popup state when deletion fails', () => {
    const { component, dialogClosed, dialogsLoadingService, planetMessage } = createComponent(throwError(new Error('delete failed')));

    component.onStarClick();
    component.popupForm.setValue({ rate: 0, comment: '' });
    dialogClosed.next({ rate: 0, comment: '' });

    expect(component.rating).toEqual(initialRating());
    expect(component.rateForm.value).toEqual({ rate: 5 });
    expect(component.popupForm.value).toEqual({ rate: 5, comment: 'Original comment' });
    expect(component.isPopupOpen).toBe(false);
    expect(planetMessage.showAlert).toHaveBeenCalledWith('There was an issue updating your rating');
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });

  it('resets popup state without deleting when no rating document exists', () => {
    const { component, couchService, dialogClosed } = createComponent();
    component.rating = {
      rateSum: 0,
      totalRating: 0,
      maleRating: 0,
      femaleRating: 0,
      userRating: {},
      allRatings: []
    };
    component.ngOnChanges();
    component.rateForm.setValue({ rate: 3 });

    component.openDialog();
    component.popupForm.controls.rate.setValue(0);
    dialogClosed.next({ rate: 0, comment: '' });

    expect(couchService.delete).not.toHaveBeenCalled();
    expect(component.rateForm.value).toEqual({ rate: 0 });
    expect(component.popupForm.value).toEqual({ rate: 0, comment: '' });
    expect(component.isPopupOpen).toBe(false);
  });
});
