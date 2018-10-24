import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';

@Injectable()
export class ResourcesService {
  private dbName = 'resources';
  private resourcesUpdated = new Subject<any>();
  resources = { local: [], parent: [] };
  ratings = { local: [], parent: [] };
  isActiveResourceFetch = false;

  constructor(
    private ratingService: RatingService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService
  ) {
    this.ratingService.ratingsUpdated$.subscribe((res: any) => {
      const planetField = res.parent ? 'parent' : 'local';
      this.ratings[planetField] = res.ratings.filter((rating: any) => rating.type === 'resource');
      if (!this.isActiveResourceFetch) {
        this.setResources(this.resources[planetField], res.ratings, planetField);
      }
    });
    this.stateService.couchStateListener(this.dbName).subscribe(response => {
      if (response !== undefined) {
        this.isActiveResourceFetch = false;
        this.setResources(response.newData, this.ratings[response.planetField], response.planetField);
      }
    });
  }

  resourcesListener(parent: boolean) {
    return this.resourcesUpdated.pipe(
      map((resources: any) => parent ? resources.parent : resources.local)
    );
  }

  requestResourcesUpdate(parent: boolean, fetchRating: boolean = true) {
    this.isActiveResourceFetch = true;
    this.stateService.requestData(this.dbName, parent ? 'parent' : 'local');
    if (fetchRating) {
      this.ratingService.newRatings(parent);
    }
  }

  setResources(resources, ratings, planetField) {
    this.resources[planetField] = this.ratingService.createItemList(resources, ratings);
    this.resourcesUpdated.next(this.resources);
  }

  getRatings(resourceIds: string[], opts: any) {
    return this.ratingService.getRatings({ itemIds: resourceIds, type: 'resource' }, opts);
  }

  libraryAddRemove(resourceIds, type) {
    return this.userService.changeShelf(resourceIds, 'resourceIds', type).pipe(map((res) => {
      const admissionMessage = type === 'remove' ? 'Resource successfully removed from myLibrary' : 'Resource added to your dashboard';
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }
}
