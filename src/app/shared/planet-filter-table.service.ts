import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Injectable()
export class PlanetFilterTableService {

  filterSpecificFields (filterFields: string[]): any {
    return (data: any, filter: string) => {
      for (let i = 0; i < filterFields.length; i++) {
        if (data[filterFields[i]].toLowerCase().indexOf(filter) > -1) {
          return true;
        }
      }
    };
  }

}
