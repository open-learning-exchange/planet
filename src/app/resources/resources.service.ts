import { Injectable } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { UserService } from '../shared/user.service';
import { UsersService } from '../users/users.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { TagsService } from '../shared/forms/tags.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { DataAccessService } from '../shared/data-access.service';

@Injectable({
  providedIn: 'root'
})
export class ResourcesService {
  private dbName = 'resources';
  private resourcesUpdated = new Subject<any>();
  resources = { local: [], parent: [] };
  ratings = { local: [], parent: [] };
  tags = { local: [], parent: [] };
  isActiveResourceFetch = false;

  constructor(
    private ratingService: RatingService,
    private userService: UserService,
    private usersService: UsersService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private tagsService: TagsService,
    private couchService: CouchService,
    private dataAccessService: DataAccessService
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
        this.isActiveResourceFetch = response.inProgress;
        const resources = response.newData.map((resource: any) => ({ doc: resource, _id: resource._id, _rev: resource._rev }));
        this.setResources(resources, this.ratings[response.planetField], response.planetField);
      }
    });
    this.stateService.couchStateListener('tags').subscribe(response => {
      if (response !== undefined) {
        this.tags[response.planetField] = response.newData.map(this.tagsService.fillSubTags);
        if (!this.isActiveResourceFetch) {
          this.setTags(this.resources[response.planetField], this.tags[response.planetField], response.planetField);
        }
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
    this.stateService.requestData(this.dbName, parent ? 'parent' : 'local', { 'title': 'asc' });
    this.stateService.requestData('tags', parent ? 'parent' : 'local');
    if (fetchRating) {
      this.ratingService.newRatings(parent);
    }
  }

  setResources(resources, ratings, planetField) {
    this.setTags(resources, this.tags[planetField], planetField);
    this.resources[planetField] = this.ratingService.createItemList(this.resources[planetField], ratings);
    this.updateResources(this.resources);
  }

  setTags(resources, tags, planetField) {
    this.resources[planetField] = this.tagsService.attachTagsToDocs(this.dbName, resources, tags);
    this.updateResources(this.resources);
  }

  updateResources(resources) {
    this.resourcesUpdated.next(resources);
  }

  getRatings(resourceIds: string[], opts: any) {
    return this.ratingService.getRatings({ itemIds: resourceIds, type: 'resource' }, opts);
  }

  libraryAddRemove(resourceIds, type) {
    return this.dataAccessService.changeShelfData(resourceIds, 'resourceIds', type).pipe(map(({ shelf, countChanged }) => {
      const resource = this.resources.local.find(r => r._id === resourceIds[0]);
      const resourceTitle = resource ? resource.doc.title : '';
      const message = type === 'remove' ?
        (countChanged === 1 ? $localize`Removed from myLibrary: ${resourceTitle}` :
          `${countChanged} ${$localize`Resources`} removed from myLibrary`) :
        (countChanged === 1 ? $localize`Added to myLibrary: ${resourceTitle}` :
          `${countChanged} ${$localize`Resources`} added to myLibrary`);
      this.planetMessageService.showMessage(message);
      return shelf;
    }));
  }

  updateResourceTags(resourceIds, tagIds, indeterminateIds = []) {
    return this.tagsService.updateManyTags(
      this.resources.local, this.dbName, { selectedIds: resourceIds, tagIds, indeterminateIds }
    ).pipe(map((res) => {
      this.requestResourcesUpdate(false);
      return res;
    }));
  }

  updateResource(resourceInfo, file, { newTags, existingTags } = { newTags: [], existingTags: [] }, sanitizedFileName = null) {
    return this.couchService.updateDocument(this.dbName, { createdDate: this.couchService.datePlaceholder, ...resourceInfo }, ).pipe(
      switchMap((resourceRes) =>
        forkJoin([
          of(resourceRes),
          file ?
            this.couchService.putAttachment(
              this.dbName + '/' + resourceRes.id + '/' + (sanitizedFileName ? sanitizedFileName : file.name) + '?rev=' + resourceRes.rev,
              file, { headers: { 'Content-Type': file.type } }
            ) :
            of({}),
          this.couchService.bulkDocs('tags', this.tagsService.tagBulkDocs(resourceRes.id, this.dbName, newTags, existingTags))
        ])
      )
    );
  }

  // Function which takes a MIME Type as a string and returns whether the file is an
  // image, audio file, video, pdf, or zip.  If none of those five returns 'other'
  simpleMediaType(mimeType: string) {
    const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
    return mediaTypes.find((type) => mimeType.indexOf(type) > -1) || 'other';
  }

  sendResourceNotification() {
    const currentUser = this.userService.get();
    const userAlreadyNotified = (user, notifications) => notifications.every(notification => notification.user !== user._id);
    return forkJoin([
      this.usersService.getAllUsers(),
      this.couchService.findAll('notifications', findDocuments({ link: '/resources', type: 'newResource', status: 'unread' }))
    ]).pipe(
      switchMap(([ users, notifications ]: [ any[], any[] ]) => {
        const notificationDocs = users
          .filter(user => currentUser.name !== user.name && user.name !== 'satellite' && userAlreadyNotified(user, notifications))
          .map(user => this.newResourceNotification(user));
        return this.couchService.bulkDocs('notifications', notificationDocs);
    }));
  }

  newResourceNotification(user) {
    return {
      'user': user._id,
      'message': $localize`There are new resources in the Library. Click to see them!`,
      'link' : '/resources',
      'linkParams': { sort: 'createdDate' },
      'type': 'newResource',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode: user.planetCode
    };
  }

}
