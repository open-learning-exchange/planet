import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
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
    return this.couchService.get('resources/_design/resources/_view/count_tags?group=true', opts).pipe(
      map((response: any) => response.rows.sort((a, b) => b.value - a.value))
    );
  }

  filterTags(tags: any[], filterString: string): string[] {
    return tags.filter((tag: any) => tag.key.indexOf(filterString) > -1);
  }

}
