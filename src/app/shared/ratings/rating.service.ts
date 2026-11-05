import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { defer, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { CouchService } from '@shared/database/couchdb.service';
import { findDocuments } from '@shared/database/mango-queries';
import { UserService } from '@shared/auth/user.service';
import { StateService } from '@shared/state.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { disableCommentWhenUnrated, ratingFormFields, RatingFormModel, RatingFormValue } from './rating-form';

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {}, allRatings: [] };

export type RatingType = 'course' | 'resource';

export interface RatingInfo {
  rateSum: number;
  totalRating: number;
  maleRating: number;
  femaleRating: number;
  userRating: any;
  allRatings: any[];
}

export interface SaveRatingOptions {
  item: any;
  type: RatingType;
  rate: number;
  comment?: string;
  existingRating?: any;
  ratingInfo?: Partial<RatingInfo>;
}

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private dbName = 'ratings';
  private ratingsUpdated = new Subject<any>();
  private ratingInteractions = new Set<string>();
  ratingsUpdated$ = this.ratingsUpdated.asObservable();
  ratings: any[];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  newRatings(parent: boolean) {
    const opts = parent ? { domain: this.stateService.configuration.parentDomain } : {};
    this.couchService.findAll(
      this.dbName, findDocuments({ _id: { $gt: null } }, [], [ { item: 'desc' } ]), opts
    ).pipe(catchError(err =>
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      of([])
    )).subscribe((res: any) => {
      this.ratings = res;
      this.ratingsUpdated.next({ ratings: res, parent });
    });
  }

  getRatings({ itemIds, type }: {itemIds: string[], type: string}, opts: any) {
    const itemSelector = itemIds.length > 0 ?
      { $in: itemIds } : { $gt: null };
    return this.couchService.findAll(this.dbName, findDocuments({
      // Selector
      type,
      // Must have sorted property in selector to sort correctly
      item: itemSelector
    }, 0, [ { item: 'desc' } ]), opts);
  }

  createItemList(itemsRes, ratings) {
    return itemsRes.map((res: any) => {
      const item = res;
      const ratingIndex = ratings.findIndex(rating => item._id === rating.item);
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

  normalizeRatingInfo(ratingInfo: Partial<RatingInfo> = {}): RatingInfo {
    const allRatings = [ ...(ratingInfo.allRatings || []) ];
    return {
      rateSum: allRatings.reduce((sum, rating) => sum + (rating.rate || 0), 0),
      totalRating: allRatings.length,
      maleRating: allRatings.filter(rating => rating.user?.gender === 'male').length,
      femaleRating: allRatings.filter(rating => rating.user?.gender === 'female').length,
      userRating: ratingInfo.userRating || {},
      allRatings
    };
  }

  // existingRating is destructured first so an omitted comment defaults to the stored one
  // rather than blanking it
  saveRating(
    { item, type, rate, existingRating = {}, comment = existingRating.comment ?? '', ratingInfo = {} }: SaveRatingOptions
  ): Observable<RatingInfo> {
    return defer(() => {
      const itemId = this.itemId(item);
      // Marked before the write lands so leaving mid-save cannot prompt for, and post, a second rating
      this.markRatingInteraction(itemId);
      const itemDoc = item.doc ?? item;
      const configuration = this.stateService.configuration;
      const newRating = {
        ...existingRating,
        type,
        item: itemId,
        title: itemDoc.title || itemDoc.courseTitle,
        createdTime: existingRating.createdTime || this.couchService.datePlaceholder,
        rate,
        comment,
        time: this.couchService.datePlaceholder,
        user: this.userService.get(),
        createdOn: configuration.code,
        parentCode: configuration.parentCode
      };
      const currentRatingInfo = this.normalizeRatingInfo(ratingInfo);
      return this.couchService.updateDocument(this.dbName, newRating).pipe(
        map((res: any) => {
          const savedRating = res.doc || { ...newRating, _id: res.id, _rev: res.rev };
          const previousIndex = currentRatingInfo.allRatings.findIndex(rating => rating._id === existingRating?._id);
          const allRatings = previousIndex === -1 ?
            [ ...currentRatingInfo.allRatings, savedRating ] :
            currentRatingInfo.allRatings.map((rating, index) => index === previousIndex ? savedRating : rating);
          this.newRatings(false);
          return this.normalizeRatingInfo({ userRating: savedRating, allRatings });
        }),
        catchError(error => this.ratingError(error))
      );
    }).pipe(this.withLoading());
  }

  deleteRating(rating: any, ratingInfo: Partial<RatingInfo> = {}): Observable<RatingInfo> {
    return defer(() => this.couchService.delete(`${this.dbName}/${rating._id}?rev=${rating._rev}`).pipe(
      map(() => {
        this.markRatingInteraction(rating.item);
        this.newRatings(false);
        return this.normalizeRatingInfo({
          userRating: {},
          allRatings: (ratingInfo.allRatings || []).filter(itemRating => itemRating._id !== rating._id)
        });
      }),
      catchError(error => this.ratingError(error))
    )).pipe(this.withLoading());
  }

  // Starting inside defer keeps start/stop paired per subscribe
  private withLoading<T>() {
    return (source: Observable<T>): Observable<T> => defer(() => {
      this.dialogsLoadingService.start();
      return source.pipe(finalize(() => this.dialogsLoadingService.stop()));
    });
  }

  private canPromptForRating(item: any, type: RatingType): boolean {
    const itemId = this.itemId(item);
    if (!this.userService.get()?._id || !itemId || this.ratingInteractions.has(itemId)) {
      return false;
    }
    const idType = type === 'course' ? 'courseIds' : 'resourceIds';
    const { inShelf } = this.userService.countInShelf([ itemId ], idType);
    return !!inShelf && !(item.rating?.userRating?.rate > 0);
  }

  private markRatingInteraction(itemId: string) {
    if (itemId) {
      this.ratingInteractions.add(itemId);
    }
  }

  resetRatingInteraction(itemId: string) {
    this.ratingInteractions.delete(itemId);
  }

  promptRating(item: any, type: RatingType): Observable<boolean> {
    if (!this.canPromptForRating(item, type)) {
      return of(true);
    }
    const formGroup = new FormGroup<RatingFormModel>({
      rate: new FormControl(0, { nonNullable: true }),
      comment: new FormControl('', { nonNullable: true })
    });
    disableCommentWhenUnrated(formGroup);
    return this.openRatingPrompt(item, type, formGroup);
  }

  private openRatingPrompt(item: any, type: RatingType, formGroup: FormGroup<RatingFormModel>): Observable<boolean> {
    const title = type === 'course' ?
      $localize`How would you rate this course?` :
      $localize`How would you rate this resource?`;
    return this.dialogsFormService.confirm<RatingFormValue>(
      title, ratingFormFields, formGroup, false, true, { cancelLabel: $localize`Not now`, submitLabel: $localize`Done` }
    ).pipe(switchMap(result => {
      const { rate, comment } = formGroup.getRawValue();
      if (!result || rate <= 0) {
        this.markRatingInteraction(this.itemId(item));
        return of(true);
      }
      return this.saveRating({ item, type, rate, comment, existingRating: item.rating?.userRating, ratingInfo: item.rating }).pipe(
        map(ratingInfo => {
          item.rating = ratingInfo;
          this.planetMessageService.showMessage($localize`Thank you, your rating is submitted!`);
          return true;
        }),
        catchError(() => this.openRatingPrompt(item, type, formGroup))
      );
    }));
  }

  private itemId(item: any): string {
    return item?._id || item?.doc?._id || '';
  }

  private ratingError(error: unknown): Observable<never> {
    this.planetMessageService.showAlert($localize`There was an issue updating your rating`);
    return throwError(error);
  }

}
