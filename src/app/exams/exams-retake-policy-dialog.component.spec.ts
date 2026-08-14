import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  ExamsRetakePolicyDialogComponent,
  RetakePolicyDialogData
} from './exams-retake-policy-dialog.component';

describe('ExamsRetakePolicyDialogComponent', () => {
  let component: ExamsRetakePolicyDialogComponent;
  let fixture: ComponentFixture<ExamsRetakePolicyDialogComponent>;

  const initialData: RetakePolicyDialogData = {
    maxAttempts: 3,
    retakeCooloffMinutes: (2 * 1440) + (4 * 60) + 30 // 2 days, 4 hours, 30 minutes
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        BrowserAnimationsModule,
        ExamsRetakePolicyDialogComponent
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: initialData }
      ]
    });
    fixture = TestBed.createComponent(ExamsRetakePolicyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize fields from dialog data', () => {
    expect(component.maxAttempts).toBe(3);
    expect(component.cooloffDays).toBe(2);
    expect(component.cooloffHours).toBe(4);
    expect(component.cooloffMinutes).toBe(30);
  });

  it('should calculate totalMinutes adding days, hours, and minutes together', () => {
    component.cooloffDays = 1;
    component.cooloffHours = 2;
    component.cooloffMinutes = 15;
    expect(component.totalMinutes).toBe(1440 + 120 + 15);
  });

  it('should format totalCooloffSummary properly', () => {
    component.cooloffDays = 0;
    component.cooloffHours = 0;
    component.cooloffMinutes = 0;
    expect(component.totalCooloffSummary).toBe('No delay between attempts');

    component.cooloffDays = 1;
    component.cooloffHours = 1;
    component.cooloffMinutes = 5;
    expect(component.totalCooloffSummary).toContain('1 day');
    expect(component.totalCooloffSummary).toContain('1 hour');
    expect(component.totalCooloffSummary).toContain('5 minutes');
  });

  it('should return correct result object', () => {
    component.maxAttempts = 5;
    component.cooloffDays = 0;
    component.cooloffHours = 3;
    component.cooloffMinutes = 0;

    const result = component.getResult();
    expect(result.maxAttempts).toBe(5);
    expect(result.retakeCooloffMinutes).toBe(180);
  });
});
