import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RatingService } from '../rating/rating.service';

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} };

@Injectable()
export class ResourcesService {
  private dbName = 'resources';
  private resourcesUpdated = new Subject<any[]>();
  resourcesUpdated$ = this.resourcesUpdated.asObservable();
  private currentResources = [];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private ratingService: RatingService
  ) {}

  updateResources({ resourceIds = [], opts = {}, updateCurrentResources = false }:
    { resourceIds?: string[], opts?: any, updateCurrentResources?: boolean} = {}) {
    const resourceQuery = resourceIds.length > 0 ?
      this.getResources(resourceIds, opts) : this.getAllResources(opts);
    forkJoin(resourceQuery, this.ratingService.getRatings({ itemIds: resourceIds, type: 'resource' }, opts)).subscribe((results: any) => {
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
    return this.couchService.allDocs(this.dbName, opts);
  }

  getResources(resourceIds: string[], opts: any) {
    return this.couchService.post(this.dbName + '/_find', findDocuments({
      '_id': { '$in': resourceIds }
    }, 0, [], 1000), opts);
  }

  createResourceList(resourcesRes, ratings) {
    return this.ratingService.createItemList(resourcesRes, ratings);
  }

}
