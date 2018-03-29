import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ResourcesService {

  private resourcesDb = 'resources';
  private ratingsDb = 'ratings';
  private resourcesUpdated = new Subject<any[]>();
  resourcesUpdated$ = this.resourcesUpdated.asObservable();

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  updateResources(resourceIds: string[] = []) {
    const resourceQuery = resourceIds.length > 0 ?
      this.getResources(resourceIds) : this.getAllResources();
    forkJoin(resourceQuery, this.getRatings()).subscribe((results) => {
      const resourcesRes = results[0],
        ratingsRes = results[1];
      this.resourcesUpdated.next(this.createResourceList(resourcesRes.rows || resourcesRes.docs, ratingsRes.docs));
    }, (err) => console.log(err));
  }

  getAllResources() {
    return this.couchService.get(this.resourcesDb + '/_all_docs?include_docs=true');
  }

  getResources(resourceIds: string[]) {
    return this.couchService.post('resources/_find', findDocuments({
      '_id': { '$in': resourceIds }
    }, 0, [], 1000));
  }

  getRatings(resourceIds: string[] = []) {
    const itemSelector = resourceIds.length > 0 ?
      { '$in': resourceIds } : { '$gt': null };
    return this.couchService.post('ratings/_find', findDocuments({
      // Selector
      'type': 'resource',
      // Must have sorted property in selector to sort correctly
      'item': { '$gt': null }
    }, 0, [ { 'item': 'desc' } ], 1000)).pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of({ docs: [] });
    }));
  }

  createResourceList(resourcesRes, ratings) {
    return resourcesRes.map((r: any) => {
      const resource = r.doc || r;
      const ratingIndex = ratings.findIndex(rating => {
        return resource._id === rating.item;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToResource(resource._id, ratingIndex, ratings, Object.assign({}, startingRating));
        return { ...resource, rating: ratingInfo };
      }
      return { ...resource,  rating: Object.assign({}, startingRating) };
    });
  }

  addRatingToResource(id, index, ratings, ratingInfo: any) {
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
    if (ratings.length > index + 1 && ratings[index + 1].item === id) {
      // Ratings are sorted by resource id,
      // so this recursion will add all ratings to resource
      return this.addRatingToResource(id, index + 1, ratings, ratingInfo);
    }
    return ratingInfo;
  }

}

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} };
