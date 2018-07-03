import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} };

@Injectable()
export class ResourcesService {
  private resourcesDb = 'resources';
  private ratingsDb = 'ratings';
  private resourcesUpdated = new Subject<any[]>();
  resourcesUpdated$ = this.resourcesUpdated.asObservable();
  private currentResources = [];

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  updateResources({ resourceIds = [], opts = {}, updateCurrentResources = false }:
    { resourceIds?: string[], opts?: any, updateCurrentResources?: boolean} = {}) {
    const resourceQuery = resourceIds.length > 0 ?
      this.getResources(resourceIds, opts) : this.getAllResources(opts);
    forkJoin(resourceQuery, this.getRatings(resourceIds, opts)).subscribe((results: any) => {
      const resourcesRes = results[0].docs || results[0],
        ratingsRes = results[1];

      const resources = this.createResourceList(resourcesRes, ratingsRes.docs);

      if (updateCurrentResources && this.currentResources.length) {
        this.currentResources.map((currentResource, cIndex) => {
          resources.map(newResource => {
            if (currentResource._id === newResource._id) {
              this.currentResources[cIndex] = newResource;
            }
          });
        });
        this.resourcesUpdated.next(this.currentResources);
        return;
      }

      this.currentResources = resources;
      this.resourcesUpdated.next(resources);
    }, (err) => console.log(err));
  }

  getAllResources(opts: any) {
    return this.couchService.allDocs('resources', opts);
  }

  getResources(resourceIds: string[], opts: any) {
    return this.couchService.post('resources/_find', findDocuments({
      '_id': { '$in': resourceIds }
    }, 0, [], 1000), opts);
  }

  getRatings(resourceIds: string[], opts: any) {
    const itemSelector = resourceIds.length > 0 ?
      { '$in': resourceIds } : { '$gt': null };
    return this.couchService.post('ratings/_find', findDocuments({
      // Selector
      'type': 'resource',
      // Must have sorted property in selector to sort correctly
      'item': { '$gt': null }
    }, 0, [ { 'item': 'desc' } ], 1000), opts).pipe(catchError(err => {
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
