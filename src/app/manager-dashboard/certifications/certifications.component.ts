import { Component, OnInit, AfterViewInit, ViewChild, HostListener } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { finalize } from 'rxjs/operators';
import { CertificationsService } from './certifications.service';
import { sortNumberOrString, filterSpecificFieldsByWord } from '../../shared/table-helpers';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton, MatButton, MatMiniFabAnchor, MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

@Component({
    templateUrl: './certifications.component.html',
    styles: [`
    .action-button {
      min-width: 100px;
      width: 100px;
    }
    .mat-column-action {
      max-width: 300px;
      align-self: end;
    }
  `],
    imports: [MatToolbar, MatIconButton, RouterLink, MatIcon, NgIf, MatFormField, MatLabel, MatInput, MatButton, MatToolbarRow, MatMiniFabAnchor, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatAnchor, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator]
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
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFiltersRow = false;
  isLoading = true;

  constructor(
    private certificationsService: CertificationsService,
    private deviceInfoService: DeviceInfoService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

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
    this.isLoading = true;
    this.dialogsLoadingService.start();
    this.certificationsService.getCertifications().pipe(
      finalize(() => {
        this.isLoading = false;
        this.dialogsLoadingService.stop();
      })
    ).subscribe((certifications: any) => {
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
