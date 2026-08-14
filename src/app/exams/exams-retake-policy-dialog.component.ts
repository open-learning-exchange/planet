import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export interface RetakePolicyDialogData {
  maxAttempts: number;
  retakeCooloffMinutes: number;
}

export interface RetakePolicyDialogResult {
  maxAttempts: number;
  retakeCooloffMinutes: number;
}

@Component({
  templateUrl: './exams-retake-policy-dialog.component.html',
  styleUrls: ['./exams-retake-policy-dialog.component.scss'],
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatHint,
    MatSelect,
    MatOption,
    MatButton,
    MatIcon
  ]
})
export class ExamsRetakePolicyDialogComponent implements OnInit {
  maxAttempts = 0;
  cooloffDays = 0;
  cooloffHours = 0;
  cooloffMinutes = 0;

  readonly maxAttemptsOptions = [
    { value: 0, label: $localize`Unlimited` },
    { value: 1, label: $localize`1 attempt` },
    { value: 2, label: $localize`2 attempts` },
    { value: 3, label: $localize`3 attempts` },
    { value: 4, label: $localize`4 attempts` },
    { value: 5, label: $localize`5 attempts` },
    { value: 6, label: $localize`6 attempts` },
    { value: 7, label: $localize`7 attempts` },
    { value: 8, label: $localize`8 attempts` },
    { value: 9, label: $localize`9 attempts` },
    { value: 10, label: $localize`10 attempts` },
    { value: 15, label: $localize`15 attempts` },
    { value: 20, label: $localize`20 attempts` },
    { value: 25, label: $localize`25 attempts` },
    { value: 50, label: $localize`50 attempts` }
  ];

  readonly daysOptions = Array.from({ length: 31 }, (_, i) => i);
  readonly hoursOptions = Array.from({ length: 24 }, (_, i) => i);
  readonly minutesOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RetakePolicyDialogData
  ) {}

  ngOnInit() {
    this.maxAttempts = this.data?.maxAttempts || 0;
    const totalMinutes = this.data?.retakeCooloffMinutes || 0;
    this.cooloffDays = Math.floor(totalMinutes / 1440);
    const remainingAfterDays = totalMinutes % 1440;
    this.cooloffHours = Math.floor(remainingAfterDays / 60);
    this.cooloffMinutes = remainingAfterDays % 60;
    if (!this.minutesOptions.includes(this.cooloffMinutes)) {
      this.cooloffMinutes = Math.round(this.cooloffMinutes / 5) * 5;
      if (this.cooloffMinutes >= 60) {
        this.cooloffMinutes = 55;
      }
    }
  }

  get totalMinutes(): number {
    return (this.cooloffDays * 1440) + (this.cooloffHours * 60) + this.cooloffMinutes;
  }

  get totalCooloffSummary(): string {
    if (this.totalMinutes === 0) {
      return $localize`No delay between attempts`;
    }
    const parts: string[] = [];
    if (this.cooloffDays > 0) {
      parts.push(this.cooloffDays === 1 ? $localize`1 day` : `${this.cooloffDays} ` + $localize`days`);
    }
    if (this.cooloffHours > 0) {
      parts.push(this.cooloffHours === 1 ? $localize`1 hour` : `${this.cooloffHours} ` + $localize`hours`);
    }
    if (this.cooloffMinutes > 0) {
      parts.push(`${this.cooloffMinutes} ` + $localize`minutes`);
    }
    return parts.join(', ');
  }

  getResult(): RetakePolicyDialogResult {
    return {
      maxAttempts: this.maxAttempts,
      retakeCooloffMinutes: this.totalMinutes
    };
  }
}
