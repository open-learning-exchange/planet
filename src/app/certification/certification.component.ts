import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { CertificationService } from './certification.service';
import { sortNumberOrString } from '../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  selector: 'planet-certification',
  templateUrl: './certification.component.html',
  styleUrls: [ './certification.component.scss' ]
})
export class CertificationComponent implements OnInit, AfterViewInit {

  certifications = new MatTableDataSource();
  selection = new SelectionModel(true, []);
  displayedColumns = [
    'name',
    'action'
  ];
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private certificationService: CertificationService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.getCertifications();
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
    this.certificationService.openDeleteDialog(certification, this.deleteCertification());
  }

  getCertifications() {
    this.certificationService.getCertifications().subscribe((certifications: any) => {
      this.certifications.data = certifications;
    });
  }

  addCertification(certification?) {
    this.certificationService.openAddDialog(certification, () => {
      this.getCertifications();
      const msg = certification ? 'certification updated successfully' : 'certification created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

}
