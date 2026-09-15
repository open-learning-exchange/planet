import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DialogsFormComponent } from './dialogs-form.component';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { UserService } from '../user.service';
import { DialogGuardService } from './dialog-guard.service';
import { DialogField } from './dialogs-form.service';

describe('DialogsFormComponent', () => {
  let fixture: ComponentFixture<DialogsFormComponent>;
  let component: DialogsFormComponent;

  const dialogRef = {
    close: vi.fn(),
    backdropClick: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
    keydownEvents: vi.fn().mockReturnValue({ subscribe: vi.fn() })
  };

  const fields: DialogField[] = [
    {
      label: 'Is your feedback Urgent?',
      type: 'radio',
      name: 'priority',
      options: [ { name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' } ],
      required: true
    },
    {
      label: 'Feedback Type',
      type: 'radio',
      name: 'type',
      options: [ { name: 'Bug', value: 'bug' }, { name: 'Suggestion', value: 'suggestion' } ],
      required: true
    },
    {
      placeholder: 'Your Feedback',
      type: 'textarea',
      name: 'message',
      required: true
    }
  ];

  const createComponent = (customData?: any) => {
    const data = customData || {
      title: 'Feedback',
      fields,
      formGroup: {
        priority: [ '', Validators.required ],
        type: [ '', Validators.required ],
        message: [ '', Validators.required ]
      },
      closeOnSubmit: true
    };

    TestBed.configureTestingModule({
      imports: [ DialogsFormComponent ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: { open: vi.fn(), openDialogs: [] } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        { provide: DialogsListService, useValue: { attachDocsData: vi.fn() } },
        {
          provide: UserService,
          useValue: { isBetaEnabled: () => false, doesUserHaveRole: () => true, userChange$: of({ _id: 'tester' }) }
        },
        { provide: DialogGuardService, useValue: { open: vi.fn() } }
      ]
    });

    fixture = TestBed.createComponent(DialogsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => {
    dialogRef.close.mockClear();
    vi.restoreAllMocks();
  });

  it('renders required asterisks on required radio labels', () => {
    createComponent();

    const labels = fixture.debugElement.queryAll(By.css('.planet-radio-label'));
    expect(labels.length).toBe(2);

    const firstMarker = labels[0].query(By.css('.mat-form-field-required-marker'));
    expect(firstMarker).toBeTruthy();
    expect(firstMarker.nativeElement.textContent.trim()).toBe('*');

    const secondMarker = labels[1].query(By.css('.mat-form-field-required-marker'));
    expect(secondMarker).toBeTruthy();
    expect(secondMarker.nativeElement.textContent.trim()).toBe('*');
  });

  it('does not render an asterisk on optional radio labels', () => {
    const optionalFields: DialogField[] = [
      {
        label: 'Optional Survey Question',
        type: 'radio',
        name: 'optionalQuestion',
        options: [ { name: 'A', value: 'a' } ],
        required: false
      }
    ];
    createComponent({
      title: 'Survey',
      fields: optionalFields,
      formGroup: { optionalQuestion: [ '' ] },
      closeOnSubmit: true
    });

    const marker = fixture.debugElement.query(By.css('.planet-radio-label .mat-form-field-required-marker'));
    expect(marker).toBeNull();
  });

  it('shows error messages and marks radio groups as touched when submitting an invalid form', () => {
    createComponent();

    expect(component.modalForm.valid).toBe(false);
    expect(fixture.debugElement.queryAll(By.css('mat-radio-group mat-error')).length).toBe(0);

    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(component.modalForm.controls['priority'].touched).toBe(true);
    expect(component.modalForm.controls['type'].touched).toBe(true);
    expect(component.modalForm.controls['message'].touched).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    const errors = fixture.debugElement.queryAll(By.css('mat-radio-group mat-error'));
    expect(errors.length).toBe(2);
    expect(errors[0].nativeElement.textContent).toContain('This field is required');
    expect(errors[1].nativeElement.textContent).toContain('This field is required');
  });

  it('scrolls the first invalid field into view when submitting an invalid form', () => {
    createComponent();

    const firstInvalidEl = fixture.nativeElement.querySelector('.ng-invalid:not(form)');
    const scrollSpy = vi.fn();
    firstInvalidEl.scrollIntoView = scrollSpy;

    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', null);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('submits successfully and closes the dialog when the form is valid', () => {
    createComponent();

    component.modalForm.setValue({
      priority: 'yes',
      type: 'bug',
      message: 'Found an issue with radio validation'
    });
    fixture.detectChanges();

    expect(component.modalForm.valid).toBe(true);

    component.onSubmit(component.modalForm, dialogRef as any);

    expect(dialogRef.close).toHaveBeenCalledWith({
      priority: 'yes',
      type: 'bug',
      message: 'Found an issue with radio validation'
    });
  });
});
