import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { Subject, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { UserService } from '../shared/user.service';
import { dedupeShelfReduce } from '../shared/utils';
import { PlanetMessageService } from '../shared/planet-message.service';

@Injectable()
export class ResourcesService {
  private dbName = 'resources';
  private resourcesUpdated = new Subject<any[]>();
  resourcesUpdated$ = this.resourcesUpdated.asObservable();
  private currentResources = [];
  currentParams: any;

  constructor(
    private couchService: CouchService,
    private ratingService: RatingService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {
    this.ratingService.ratingsUpdated$.pipe(switchMap(() => {
      const { resourceIds, opts } = this.currentParams;
      return this.getRatings(resourceIds, opts);
    })).subscribe((ratings) => {
      this.setResources(this.currentResources, ratings.docs, this.currentParams.updateCurrentResources);
    });
  }

  updateResources({ resourceIds = [], opts = {}, updateCurrentResources = false }:
    { resourceIds?: string[], opts?: any, updateCurrentResources?: boolean} = {}) {
    this.currentParams = { resourceIds, opts, updateCurrentResources };
    const resourceQuery = resourceIds.length > 0 ?
      this.getResources(resourceIds, opts) : this.getAllResources(opts);
    forkJoin(resourceQuery, this.getRatings(resourceIds, opts)).subscribe((results: any) => {
      this.setResources(results[0].docs || results[0], results[1].docs, updateCurrentResources);
    }, (err) => console.log(err));
  }

  setResources(resourcesRes, ratings, updateCurrentResources) {
    const resources = this.createResourceList(resourcesRes, ratings);
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
  }

  getAllResources(opts: any) {
    return this.couchService.findAll(this.dbName, findDocuments({
      '_id': { '$gt': null }
    }, [ '_id', '_rev', 'title', 'description', 'createdDate' ], [], 1000), opts);
  }

  getResources(resourceIds: string[], opts: any) {
    return this.couchService.post(this.dbName + '/_find', findDocuments({
      '_id': { '$in': resourceIds }
    }, 0, [], 1000), opts);
  }

  getRatings(resourceIds: string[], opts: any) {
    return this.ratingService.getRatings({ itemIds: resourceIds, type: 'resource' }, opts);
  }

  createResourceList(resourcesRes, ratings) {
    return this.ratingService.createItemList(resourcesRes, ratings);
  }

  libraryAddRemove(resourceIds, type) {
    return this.userService.changeShelf(resourceIds, 'resourceIds', type).pipe(map((res) => {
      const admissionMessage = type === 'remove' ? 'Resource successfully removed from myLibrary' : 'Resource added to your dashboard';
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }
}
