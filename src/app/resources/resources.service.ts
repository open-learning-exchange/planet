import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { Subject, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class ResourcesService {
  private dbName = 'resources';
  private resourcesUpdated = new Subject<any>();
  resources = { local: [], parent: [] };
  ratings = { local: [], parent: [] };
  lastSeq = { local: '', parent: '' };
  isActiveResourceFetch = false;

  constructor(
    private couchService: CouchService,
    private ratingService: RatingService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private configurationService: ConfigurationService
  ) {
    this.ratingService.ratingsUpdated$.subscribe((res: any) => {
      const planetField = res.parent ? 'parent' : 'local';
      this.ratings[planetField] = res.ratings.filter((rating: any) => rating.type === 'resource');
      if (!this.isActiveResourceFetch) {
        this.setResources(this.resources[planetField], [], res.ratings, planetField);
      }
    });
  }

  resourcesListener(parent: boolean) {
    return this.resourcesUpdated.pipe(
      map((resources: any) => parent ? resources.parent : resources.local)
    );
  }

  requestResourcesUpdate(parent: boolean) {
    const opts = parent ? { domain: this.configurationService.configuration.parentDomain } : {};
    const currentResources = parent ?
      this.resources.parent : this.resources.local;
    const planetField = parent ? 'parent' : 'local';
    const getCurrentResources = currentResources.length === 0 ?
      this.getAllResources(opts) : of(currentResources);
    this.isActiveResourceFetch = true;
    forkJoin([ getCurrentResources, this.updateResourcesChanges(opts, planetField) ])
    .subscribe(([ resources, newResources ]) => {
      this.isActiveResourceFetch = false;
      this.setResources(resources, newResources, this.ratings[planetField], planetField);
    });
    this.ratingService.newRatings(parent);
  }

  setResources(currentResources, newResources, ratings, planetField) {
    const resources = newResources.length > 0 ?
      this.couchService.combineChanges(currentResources, newResources) : currentResources;
    this.resources[planetField] = this.createResourceList(resources, ratings);
    this.resourcesUpdated.next(this.resources);
  }

  getAllResources(opts: any) {
    return this.couchService.findAll(this.dbName, findDocuments({
      '_id': { '$gt': null }
    }, [], [], 1000), opts);
  }

  updateResourcesChanges(opts: any, planetField: string) {
    return this.couchService
    .get(this.dbName + '/_changes?include_docs=true&since=' + (this.lastSeq[planetField] || 'now'), opts)
    .pipe(map((res: any) => {
      this.lastSeq[planetField] = res.last_seq;
      return res.results.filter((r: any) => r._id.indexOf('_design') === -1).map((r: any) => r.doc);
    }));
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
