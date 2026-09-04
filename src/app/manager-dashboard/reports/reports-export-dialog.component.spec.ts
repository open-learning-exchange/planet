import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { ReportsExportDialogComponent, ReportsExportDialogData } from './reports-export-dialog.component';

describe('ReportsExportDialogComponent', () => {
  let component: ReportsExportDialogComponent;
  let fixture: ComponentFixture<ReportsExportDialogComponent>;
  let data: ReportsExportDialogData;
  const dialogRefMock = { close: vi.fn() };

  beforeEach(waitForAsync(() => {
    data = {
      title: 'Export Resources Report',
      reports: [
        { name: 'Resource Views', value: 'resourceViews' },
        { name: 'Resources Overview', value: 'resourcesOverview' }
      ],
      teamOptions: [ { name: 'All Members', value: 'All' } ],
      team: 'All',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      minDate: new Date('2025-01-01'),
      maxDate: new Date('2026-03-01'),
      onSubmit: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [ ReportsExportDialogComponent ],
      providers: [
        provideNativeDateAdapter(),
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportsExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the first report with its sorting options', () => {
    expect(component.selectedReport).toBe('resourceViews');
    expect(component.exportForm.controls.sortBy.value).toBe('userAsc');
  });

  it('drops the sorting options for a report that has none', () => {
    component.exportForm.controls.report.setValue('resourcesOverview');

    expect(component.sortingOptions).toEqual([]);
    expect(component.exportForm.controls.sortBy.value).toBeNull();
  });

  it('hands the chosen report to the caller with the requested action', () => {
    component.export('preview');

    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(data.onSubmit).toHaveBeenCalledWith({
      report: 'resourceViews',
      startDate: data.startDate,
      endDate: data.endDate,
      team: 'All',
      sortBy: 'userAsc'
    }, 'preview');
  });

  it('does not export while the date range is invalid', () => {
    component.exportForm.controls.endDate.setValue(new Date('2025-12-01'));

    component.export('download');

    expect(data.onSubmit).not.toHaveBeenCalled();
  });

  it('offers a download and a preview button', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.km-preview')).toBeTruthy();
    expect(element.querySelector('.km-download')).toBeTruthy();
  });
});
