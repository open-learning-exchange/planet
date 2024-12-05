import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { findDocuments } from '../mangoQueries';
import { UserService } from '../user.service';
import { of, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StateService } from '../state.service';

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {}, allRatings: [] };

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private dbName = 'ratings';
  private ratingsUpdated = new Subject<any>();
  ratingsUpdated$ = this.ratingsUpdated.asObservable();
  ratings: any[];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService
  ) {}

  newRatings(parent: boolean) {
    const opts = parent ? { domain: this.stateService.configuration.parentDomain } : {};
    this.couchService.findAll(
      this.dbName, findDocuments({ '_id': { '$gt': null } }, [], [ { 'item': 'desc' } ]), opts
    ).pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of([]);
    })).subscribe((res: any) => {
      this.ratings = res;
      this.ratingsUpdated.next({ ratings: res, parent });
    });
  }

  getRatings({ itemIds, type }: {itemIds: string[], type: string}, opts: any) {
    const itemSelector = itemIds.length > 0 ?
      { '$in': itemIds } : { '$gt': null };
    return this.couchService.findAll(this.dbName, findDocuments({
      // Selector
      type,
      // Must have sorted property in selector to sort correctly
      'item': itemSelector
    }, 0, [ { 'item': 'desc' } ]), opts);
  }

  createItemList(itemsRes, ratings) {
    return itemsRes.map((res: any) => {
      const item = res;
      const ratingIndex = ratings.findIndex(rating => {
        return item._id === rating.item;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToItem(item._id, ratingIndex, ratings, Object.assign({}, startingRating));
        return { ...item, rating: ratingInfo };
      }
      return { ...item, rating: Object.assign({}, startingRating) };
    });
  }

  addRatingToItem(id, index, ratings, ratingInfo: any) {
    const rating = ratings[index];
    // If totalRating is undefined, will start count at 1
    ratingInfo.totalRating = ratingInfo.totalRating + 1;
    ratingInfo.rateSum = ratingInfo.rateSum + rating.rate;
    switch (rating.user.gender) {
      case 'male':
        ratingInfo.maleRating = ratingInfo.maleRating + 1;
        break;
      case 'female':
        ratingInfo.femaleRating = ratingInfo.femaleRating + 1;
        break;
    }
    ratingInfo.userRating = rating.user.name === this.userService.get().name ? rating : ratingInfo.userRating;
    ratingInfo.allRatings = [ ...ratingInfo.allRatings, rating ];
    if (ratings.length > index + 1 && ratings[index + 1].item === id) {
      // Ratings are sorted by item id,
      // so this recursion will add all ratings to item
      return this.addRatingToItem(id, index + 1, ratings, ratingInfo);
    }
    return ratingInfo;
  }

}
