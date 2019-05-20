import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ManagerService } from '../manager-dashboard/manager.service';
import { StateService } from './state.service';
import { TagsService } from './forms/tags.service';

@Injectable()
export class SyncService {

  private parentDomain: string;
  private code: string;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private managerService: ManagerService,
    private tagsService: TagsService
  ) {}

  createChildPullDoc(items: any[], db, planetCode) {
    const resourcesToSend = items.map(item => ({ db, sendTo: planetCode, item }));
    return this.couchService.post('send_items/_bulk_docs', { 'docs': resourcesToSend });
  }

  confirmPasswordAndRunReplicators(replicators) {
    return this.managerService.openPasswordConfirmation().pipe(switchMap((credentials) => {
      return forkJoin(replicators.map((replicator) => this.sync(replicator, credentials)));
    }));
  }

  sync(replicator, credentials) {
    this.parentDomain = this.stateService.configuration.parentDomain || replicator.parentDomain;
    this.code = this.stateService.configuration.code || replicator.code;
    return this.couchService.post('_replicator', this.syncParams(replicator, credentials, replicator.type));
  }

  deleteReplicators(replicators) {
    return this.couchService.post('_replicator/_bulk_docs', { docs: replicators });
  }

  private syncParams(replicator, credentials, type) {
    const dbSource = replicator.dbSource || replicator.db;
    const dbTarget = replicator.dbTarget || replicator.db;
    if (replicator.items) {
      replicator.selector = this.itemSelector(replicator.items);
    }
    return {
      // Name the id always after the local database
      '_id': (type === 'push' ? dbSource : dbTarget) + '_' + type + (replicator.date ? '_' + Date.now() : ''),
      'source': this.dbObj(dbSource, credentials, type === 'pull' && type !== 'internal'),
      'target': this.dbObj(dbTarget, credentials, type !== 'pull' && type !== 'internal'),
      'selector': replicator.selector,
      'create_target':  false,
      'owner': credentials.name,
      'continuous': replicator.continuous
    };
  }

  private itemSelector(items) {
    return { '$or': items.map((res) => ({ _id: res._id, _rev: res._rev })) };
  }

  private dbObj(dbName, credentials, parent: boolean) {
    const username = credentials.name + (parent ? '@' + this.code : '');
    const domain = parent ? this.parentDomain + '/' : environment.syncAddress + '/';
    const protocol = parent ? environment.parentProtocol + '://' : '';
    return {
      'headers': {
        'Authorization': 'Basic ' + btoa(username + ':' + credentials.password)
      },
      'url': protocol + domain + dbName
    };
  }

  replicatorsArrayWithTags(items, type: 'pull' | 'push', planetField: 'local' | 'parent') {
    return this.stateService.getCouchState('tags', planetField).pipe(map(tags => this.createReplicatorsArray(items, type, tags)));
  }

  createReplicatorsArray(items, type: 'pull' | 'push', allTags: any[] = [], replicators = []) {
    return items.reduce((newReplicators: any[], item: any) => {
      const doc = item.item;
      const syncObjectIndex = newReplicators.findIndex((replicator: any) => replicator.db === item.db);
      if (syncObjectIndex === -1) {
        newReplicators.push(this.newReplicatorObject(item, type, doc));
      } else {
        newReplicators[syncObjectIndex] = this.combineReplicatorObject(item, doc, newReplicators[syncObjectIndex]);
      }
      switch (item.db) {
        case 'courses':
          return this.coursesItemsToSync(doc, type, newReplicators, allTags);
        case 'resources':
          return this.resourcesItemsToSync(doc, type, newReplicators, allTags);
        case 'achievements':
          return this.achievementsItemsToSync(doc, type, newReplicators, allTags);
        default:
          return newReplicators;
      }
    }, replicators);
  }

  newReplicatorObject(item, type, doc) {
    if (item.selector) {
      return item;
    }
    return { db: item.db, type, date: true, items: [ doc ] };
  }

  combineReplicatorObject(item, doc, syncObject) {
    if (item.selector) {
      return { ...syncObject, selector: { '$or': [ ...syncObject.selector.$or, ...item.selector.$or ] } };
    }
    return { ...syncObject, items: [ ...syncObject.items, doc ] };
  }

  coursesItemsToSync(course, type, replicators, allTags) {
    return this.createReplicatorsArray(
      [].concat.apply([], course.doc.steps.map(step =>
        step.resources.map(r => ({ item: r, db: 'resources' }))
        .concat(step.exam ? [ { item: step.exam, db: 'exams' } ] : [])
        .concat(step.survey ? [ { item: step.survey, db: 'exams' } ] : [])
        ).concat(course.tags ? [ this.tagsSync(course.tags, type) ] : [])
      ),
      type,
      allTags,
      replicators
    );
  }

  resourcesItemsToSync(resource, type, replicators, allTags) {
    resource = allTags.length > 0 ? this.tagsService.attachTagsToDocs('resources', [ resource ], allTags)[0] : resource;
    return resource.tags === undefined || resource.tags.length === 0 ? replicators :
      this.createReplicatorsArray([ this.tagsSync(resource.tags, type) ], type, allTags, replicators);
  }

  achievementsItemsToSync(achievement, type, replicators, allTags) {
    return this.createReplicatorsArray(
      [].concat.apply([], achievement.achievements.map(({ resources }) =>
        (resources || [] ).map(r => ({ item: r, db: 'resources' })))
      ),
      type,
      allTags,
      replicators
    );

  }

  tagsSync(tags: any[], type: string) {
    const tagIds = tags.map(tag => ({ _id: tag._id }));
    return ({
      db: 'tags',
      type,
      date: true,
      selector: { '$or': [ ...tagIds, { linkId: tags[0].tagLink.linkId, db: tags[0].tagLink.db } ] }
    });
  }

}
