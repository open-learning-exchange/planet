import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTable, MatTableDataSource, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell,
  MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow
} from '@angular/material/table';
import { CSV_PREVIEW_MAX_ROWS, CsvPreviewTable, CsvService } from '../../shared/csv.service';

const PREVIEW_POLL_INTERVAL = 250;
const PREVIEW_TIMEOUT = 60 * 1000;

@Component({
  templateUrl: './reports-csv-preview.component.html',
  styleUrl: './reports-csv-preview.component.scss',
  imports: [
    MatButton, MatIcon, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell,
    MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatSort, MatSortHeader, MatPaginator
  ]
})
export class ReportsCsvPreviewComponent implements OnInit, OnDestroy {

  title = '';
  columns: string[] = [];
  rowCount = 0;
  truncated = false;
  isLoading = true;
  loadError = false;
  dataSource = new MatTableDataSource<any>([]);
  readonly maxRows = CSV_PREVIEW_MAX_ROWS;
  private storageKey: string;
  private onDestroy$ = new Subject<void>();
  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }
  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  constructor(
    private route: ActivatedRoute,
    private csvService: CsvService
  ) {}

  ngOnInit() {
    this.storageKey = this.route.snapshot.queryParams.key;
    if (!this.storageKey) {
      this.fail();
      return;
    }
    // The tab is opened before its report exists, so wait for the tab that opened it to hand the rows over
    const startedAt = Date.now();
    interval(PREVIEW_POLL_INTERVAL).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      const table = this.readPreview();
      if (table) {
        this.showPreview(table);
      } else if (Date.now() - startedAt > PREVIEW_TIMEOUT) {
        this.fail();
      }
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  download() {
    this.csvService.exportFormattedCSV({ data: this.dataSource.data, title: this.title });
  }

  private readPreview(): CsvPreviewTable | null {
    try {
      const stored = window.localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private showPreview(table: CsvPreviewTable) {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {}
    this.onDestroy$.next();
    this.title = table.title;
    this.columns = table.columns;
    this.truncated = table.truncated;
    this.rowCount = table.rows.length;
    this.dataSource.data = table.rows;
    this.isLoading = false;
    document.title = table.title;
  }

  private fail() {
    this.onDestroy$.next();
    this.isLoading = false;
    this.loadError = true;
  }

}
