import { Injectable } from '@angular/core';
import { CouchService } from './couchdb.service';

@Injectable()
export class FilterService {

    readonly dbName = 'resource';
    resources: any;

    constructor(private couchService: CouchService) { }

    filter(data: any, filters: string[]): any {
        this.couchService.get(this.dbName + '/_all_docs?include_docs=true')
            .subscribe((data) => {
                this.resources = data.rows.map((resource: any) => {
                    let resc: string;
                    for(let filter of filters) {
                        if(!resource.doc[filter]) resc += resource.doc[filter];
                    }
                    return resc;
                  });
                  return (data: any, filter: string) : boolean => {
                      for(let rec of this.resources) {
                        if(rec.indexOf(filter) >= 0) return true;
                      }
                      return false;
                  }
            });

    }
}