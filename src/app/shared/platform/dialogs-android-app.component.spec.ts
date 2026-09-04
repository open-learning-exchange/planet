import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { DialogsAndroidAppComponent } from './dialogs-android-app.component';

describe('DialogsAndroidAppComponent', () => {
  let fixture: ComponentFixture<DialogsAndroidAppComponent>;
  const dialogRef = { close: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DialogsAndroidAppComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }]
    });
    fixture = TestBed.createComponent(DialogsAndroidAppComponent);
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
