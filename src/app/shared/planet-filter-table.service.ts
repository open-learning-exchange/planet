import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

@Injectable()
export class PlanetFilterTableService {

  filter(filterData: any, dataSource: MatTableDataSource<any>): any {
    class FilterClass {}
    Object.keys(filterData).forEach(function(key){
      FilterClass[filterData[key]];
    });
    return dataSource.filterPredicate = (data: FilterClass, filter: string) => {
      for (let i = 0; i < filterData.length; i++) {
        if (data[filterData[i]].indexOf(filter) > -1) {
          return true;
        }
      }
    } ;
  }

}
