import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { AndroidAppDialogComponent } from './android-app-dialog.component';

describe('AndroidAppDialogComponent', () => {
  let fixture: ComponentFixture<AndroidAppDialogComponent>;
  const dialogRef = { close: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AndroidAppDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }]
    });
    fixture = TestBed.createComponent(AndroidAppDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    dialogRef.close.mockClear();
  });

  it('renders a uniquely named install link for each Android app', () => {
    const links = fixture.debugElement.queryAll(By.css('a[mat-raised-button]'));

    expect(links.map(link => link.nativeElement.getAttribute('aria-label'))).toEqual([
      'Install myPlanet',
      'Install myPlanet Lite'
    ]);
  });

  it('closes after an install link is selected', () => {
    const link = fixture.debugElement.query(By.css('a[mat-raised-button]'));

    link.triggerEventHandler('click');

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
