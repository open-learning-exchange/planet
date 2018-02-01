import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { forEach } from '@angular/router/src/utils/collection';

@Injectable()
export class PlanetFilterTableService {

  filter(filterData: any, dataSource: MatTableDataSource<any>): any {
    class FilterClass {}
    Object.keys(filterData).forEach(function(key){
      FilterClass[key];
    });
    return dataSource.filterPredicate = (data: FilterClass, filter: string) => data['admin_name'].indexOf(filter) > -1;
    // return  dataSource.filterPredicate = (data: nClass, filter: string) => {

    //   Object.keys(filterData).forEach(function(key){
    //    if (data['admin_name'].indexOf(filter) > -1) {
    //      return true;
    //    }
    //   });
    //   return false;
    // } ;
  }

}
