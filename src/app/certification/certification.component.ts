import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatDialog, MatSort, MatDialogRef } from '@angular/material';
import { CertificationService } from './certification.service';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  selector: 'app-certification',
  templateUrl: './certification.component.html',
  styleUrls: ['./certification.component.scss']
})
export class CertificationComponent implements OnInit {

  @Input() data = [];
  @Input() certificationDetail: any;
  @Input() isDialog = false;
  @Output() switchView = new EventEmitter<'close' | 'add'>();
  certifications = new MatTableDataSource();
  selection = new SelectionModel(true, []);
  revision = null;
  id = null;
  readonly dbName = 'certificatios'; // database name constant
  displayedColumns = [
    'name',
    'action'
  ];

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  constructor(
    private certificationService: CertificationService,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.certificationService.getCertificationList().subscribe((certificationList: any) => {
      this.certifications.data = certificationList;
    });
  }

  ngOnChanges() {
    this.certifications.data = this.data;
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
        (certification: any) => deletedCertifications.findIndex(deletedCertification => deletedCertification.id === certification._id) === -1
      );
    };
  }

  deleteClick(certification) {
    this.certificationService.openDeleteDialog(certification, this.deleteCertification());
  }

}
