import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { PlanetRatingStarsComponent } from './planet-rating-stars.component';
import { PlanetRatingComponent } from './planet-rating.component';

describe('PlanetRatingComponent rating clearing', () => {
  it('resets rating value to 0 on clearRating', () => {
    const component = new PlanetRatingStarsComponent(null as any, {} as any);
    component.value = 4;
    component.clearRating();
    expect(component.value).toBe(0);
  });

  it('deletes rating document when clearing to 0 stars', () => {
    const couchService = { delete: vi.fn().mockReturnValue(of({ ok: true })) };
    const ratingService = { newRatings: vi.fn() };
    const component = new PlanetRatingComponent(
      new FormBuilder().nonNullable,
      couchService as any,
      { showMessage: vi.fn() } as any,
      { countInShelf: () => ({ inShelf: true }), get: () => ({ _id: 'u-1' }) } as any,
      {} as any,
      ratingService as any,
      { configuration: {} } as any
    );
    component.item = { _id: 'item-1' };
    component.rating = { userRating: { _id: 'r-1', _rev: '1-a', rate: 5 } };
    component.rateForm.setValue({ rate: 0 });

    component.onStarClick(component.rateForm);

    expect(couchService.delete).toHaveBeenCalledWith('ratings/r-1?rev=1-a');
    expect(ratingService.newRatings).toHaveBeenCalledWith(false);
  });
});
