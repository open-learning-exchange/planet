import { Component, Input, OnChanges, OnDestroy, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResourcesService } from '../resources.service';
import { StateService } from '../../shared/state.service';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';
import { CSV_PREVIEW_MAX_BYTES, CSV_PREVIEW_MAX_ROWS, CsvService } from '../../shared/csv.service';
import { couchAttachmentPath } from '../../shared/utils';
import { NgClass } from '@angular/common';
import { MatIconButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatTable, MatTableDataSource, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell,
  MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow
} from '@angular/material/table';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'planet-resources-viewer',
  templateUrl: './resources-viewer.component.html',
  styleUrls: ['./resources-viewer.scss'],
  imports: [
    NgClass, MatIconButton, MatIcon, MatAnchor, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell,
    MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatSort,
    MatSortHeader, MatPaginator
  ]
})
export class ResourcesViewerComponent implements OnChanges, OnDestroy {

  @Input() resourceId: string;
  @Input() fetchRating = true;
  @Input() isDialog = false;
  @Output() resourceUrl = new EventEmitter<any>();
  mediaType: string;
  contentType: string;
  resourceSrc: string;
  shownResourceId: string;
  resource: any;
  parent = this.route.snapshot.data.parent;
  pdfSrc: any;
  csvColumns: string[] = [];
  dataSource: MatTableDataSource<any>;
  csvLoadError = false;
  csvPreviewTooLarge = false;
  csvPreviewTruncated = false;
  readonly csvPreviewMaxSizeMb = CSV_PREVIEW_MAX_BYTES / 1024 / 1024;
  readonly csvPreviewMaxRows = CSV_PREVIEW_MAX_ROWS;
  private sortRef: MatSort;
  private paginatorRef: MatPaginator;
  private csvLoadSub: Subscription;
  private onDestroy$ = new Subject<void>();
  @ViewChild('pdfViewer') pdfViewer: ElementRef;
  @ViewChild(MatSort) set sort(sort: MatSort) {
    this.sortRef = sort;
    this.assignCsvTableControls();
  }
  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    this.paginatorRef = paginator;
    this.assignCsvTableControls();
  }

  constructor(
    private sanitizer: DomSanitizer,
    private resourcesService: ResourcesService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private userService: UserService,
    private couchService: CouchService,
    private csvService: CsvService,
    private router: Router
  ) {
    this.resourcesService.resourcesListener(this.parent).pipe(takeUntil(this.onDestroy$))
      .subscribe((resources) => {
        if (this.shownResourceId !== this.resourceId) {
          this.shownResourceId = this.resourceId;
          this.resource = resources.find((r: any) => r._id === this.resourceId);
          if (this.resource) {
            this.setResource(this.resource.doc);
          }
        }
      });
  }

  ngOnChanges() {
    this.resourcesService.requestResourcesUpdate(this.parent, this.fetchRating);
  }

  get urlPrefix() {
    let domain = environment.couchAddress + '/resources/';
    if (this.parent) {
      domain = 'http://' + this.stateService.configuration.parentDomain + '/resources/';
    }
    return domain;
  }

  ngOnDestroy() {
    this.cancelCsvLoad();
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  resourceActivity(resource: any, activity) {
    const data = {
      'resourceId': resource._id,
      'title': resource.title,
      'user': this.userService.get().name,
      'type': activity,
      'time': this.couchService.datePlaceholder,
      'createdOn': this.stateService.configuration.code,
      'parentCode': this.stateService.configuration.parentCode,
      'url': this.router.url,
      'private': resource.private
    };
    this.couchService.updateDocument('resource_activities', data)
      .subscribe((response) => {
      }, (error) => console.log('Error'));
  }

  setResource(resource: any) {
    this.cancelCsvLoad();
    this.resetCsvPreview();
    this.resourceActivity(resource, 'visit');
    // openWhichFile is used to label which file to start with for HTML resources
    const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
    const attachment = resource._attachments[filename];
    this.mediaType = resource.mediaType;
    this.contentType = attachment.content_type;
    this.resourceSrc = this.urlPrefix + couchAttachmentPath(resource._id, filename);
    if (!this.mediaType) {
      const mediaTypes = [ 'image', 'pdf', 'audio', 'video', 'zip' ];
      this.mediaType = mediaTypes.find((type) => this.contentType.indexOf(type) > -1) || 'other';
    }
    if (this.mediaType === 'pdf' || this.mediaType === 'HTML') {
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
    }
    if (
      this.contentType === 'text/html' || this.contentType === 'text/markdown' ||
      this.contentType === 'text/plain' || this.contentType === 'application/json'
    ) {
      this.mediaType = 'HTML';
      this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.resourceSrc);
    }
    if (this.isCsvResource(filename)) {
      this.mediaType = 'csv';
      if (attachment.length > CSV_PREVIEW_MAX_BYTES) {
        this.csvPreviewTooLarge = true;
      } else {
        this.loadCsvTable(resource._id, filename);
      }
    }
    // Emit resource src so parent component can use for links
    this.resourceUrl.emit(this.resourceSrc);
  }

  private loadCsvTable(docId: string, filename: string) {
    const domain = this.parent ? this.stateService.configuration.parentDomain : undefined;
    this.csvLoadSub = this.csvService.loadCsvAttachment(docId, filename, domain)
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(({ columns, rows, truncated }) => {
        this.csvColumns = columns;
        this.csvPreviewTruncated = truncated;
        this.dataSource = new MatTableDataSource(rows);
        this.dataSource.sortingDataAccessor = (row, column) => {
          const value = `${row[column] ?? ''}`;
          const trimmedValue = value.trim();
          return trimmedValue !== '' && !isNaN(+trimmedValue) ? +trimmedValue : value.toLowerCase();
        };
        this.assignCsvTableControls();
      }, () => {
        this.csvLoadError = true;
      });
  }

  private resetCsvPreview() {
    this.dataSource = undefined;
    this.csvColumns = [];
    this.csvLoadError = false;
    this.csvPreviewTooLarge = false;
    this.csvPreviewTruncated = false;
  }

  private cancelCsvLoad() {
    if (this.csvLoadSub) {
      this.csvLoadSub.unsubscribe();
      this.csvLoadSub = undefined;
    }
  }

  private isCsvResource(filename: string) {
    const contentType = (this.contentType || '').toLowerCase().split(';')[0].trim();
    return contentType.indexOf('csv') > -1 || contentType === 'text/comma-separated-values' ||
      filename.toLowerCase().endsWith('.csv');
  }

  private assignCsvTableControls() {
    if (!this.dataSource) {
      return;
    }
    if (this.sortRef) {
      this.dataSource.sort = this.sortRef;
    }
    if (this.paginatorRef) {
      this.dataSource.paginator = this.paginatorRef;
    }
  }

  openFullscreen() {
    const elem = this.pdfViewer.nativeElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
  }

}
