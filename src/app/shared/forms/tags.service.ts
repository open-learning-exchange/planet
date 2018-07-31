import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { map } from 'rxjs/operators';

@Injectable()
export class TagsService {

  constructor(private couchService: CouchService) {}

  getTags() {
    return this.couchService.get('resources/_design/resources/_view/count_tags?group=true').pipe(
      map((response: any) => response.rows.sort((a, b) => b.value - a.value))
    );
  }

  filterTags(tags: any[], filterString: string): string[] {
    return tags.filter((tag: any) => tag.key.indexOf(filterString) > -1);
  }

}
