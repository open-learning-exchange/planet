import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CertificationsService } from './certifications.service';
import { sortNumberOrString, filterSpecificFieldsByWord } from '../../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  templateUrl: './certifications.component.html',
  styles: [ `
    .action-button {
      min-width: 100px;
      width: 100px;
    }
    .truncate-text {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      max-width: 100%;
    }
  ` ]
})
export class CertificationsComponent implements OnInit, AfterViewInit {

  certifications = new MatTableDataSource();
  selection = new SelectionModel(true, []);
  displayedColumns = [
    'name',
    'action'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private certificationsService: CertificationsService
  ) { }

  ngOnInit() {
    this.getCertifications();
    this.certifications.filterPredicate = filterSpecificFieldsByWord([ 'name' ]);
  }

  ngAfterViewInit() {
    this.certifications.sortingDataAccessor = sortNumberOrString;
    this.certifications.paginator = this.paginator;
    this.certifications.sort = this.sort;
  }

  deleteCertification() {
    return (deletedCertifications) => {
      deletedCertifications.forEach(deletedCertification => this.selection.deselect(deletedCertification.id));
      // It's safer to remove the item from the array based on its id than to splice based on the index
      this.certifications.data = this.certifications.data.filter(
        (certification: any) => deletedCertifications
          .findIndex(deletedCertification => deletedCertification.id === certification._id) === -1
      );
    };
  }

  deleteClick(certification) {
    this.certificationsService.openDeleteDialog(certification, this.deleteCertification());
  }

  getCertifications() {
    this.certificationsService.getCertifications().subscribe((certifications: any) => {
      this.certifications.data = certifications;
    });
  }

  applyFilter(filterValue: string) {
    this.certifications.filter = filterValue;
  }

  resetSearch() {
    this.certifications.filter = '';
  }

}
