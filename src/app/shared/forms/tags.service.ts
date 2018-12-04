import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { StateService } from '../state.service';

@Injectable()
export class TagsService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  getTags(parent: boolean) {
    const opts = parent ? { domain: this.stateService.configuration.parentDomain } : {};
    return forkJoin([
      this.couchService.get('resources/_design/resources/_view/count_tags?group=true', opts),
      this.stateService.getCouchState('tags', parent ? 'parent' : 'local')
    ]).pipe(
      map(([ existingTags, dbTags ]: [ any, any ]) => {
        const findDbTag = (tag: any) => {
          const fullTag = dbTags.find((dbTag: any) => dbTag._id === tag.key);
          return { count: tag.value, ...(fullTag ? fullTag : { name: tag.key }) };
        };
        const unusedTags = dbTags.filter((dbTag: any) => {
          return existingTags.rows.find((tag: any) => tag.key === dbTag._id) === undefined
        });
        return existingTags.rows.sort((a, b) => b.value - a.value).map((tag: any) => findDbTag(tag)).concat(unusedTags);
      })
    );
  }

  filterTags(tags: any[], filterString: string): string[] {
    return tags.filter((tag: any) => tag.key.toLowerCase().indexOf(filterString.toLowerCase()) > -1);
  }

  newTag({ name, attachedTo }) {
    return this.couchService.post('tags', { name, attachedTo });
  }

}
