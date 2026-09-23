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
  let dialogRef: { close: ReturnType<typeof vi.fn>, backdropClick: ReturnType<typeof vi.fn>, keydownEvents: ReturnType<typeof vi.fn> };

  const originalScrollIntoView = Element.prototype.scrollIntoView;

  const fields: DialogField[] = [
    {
      label: 'Is your feedback Urgent?',
      type: 'radio',
      name: 'priority',
      options: [ { name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' } ],
      required: true
    },
    {
      label: 'Feedback Type:',
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

  const radioErrorText = () => fixture.debugElement.queryAll(By.css('mat-radio-group mat-error'))
    .map(error => error.nativeElement.textContent.trim());

  beforeEach(() => {
    dialogRef = {
      close: vi.fn(),
      backdropClick: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      keydownEvents: vi.fn().mockReturnValue({ subscribe: vi.fn() })
    };
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
  });

  it('renders required asterisks on required radio labels', () => {
    createComponent();

    const markers = fixture.debugElement.queryAll(By.css('.planet-radio-label .km-required-marker'));
    expect(markers.length).toBe(2);
    markers.forEach(marker => expect(marker.nativeElement.textContent.trim()).toBe('*'));
  });

  it('does not mark a radio group required when the field omits required', () => {
    createComponent({
      title: 'Survey',
      fields: [ {
        label: 'Optional Survey Question',
        type: 'radio',
        name: 'optionalQuestion',
        options: [ { name: 'A', value: 'a' } ]
      } ] as DialogField[],
      formGroup: { optionalQuestion: [ '' ] },
      closeOnSubmit: true
    });

    expect(fixture.debugElement.query(By.css('.planet-radio-label .km-required-marker'))).toBeNull();
    const radioInputs = fixture.debugElement.queryAll(By.css('mat-radio-button input[type="radio"]'));
    expect(radioInputs.length).toBe(1);
    radioInputs.forEach(input => expect(input.nativeElement.required).toBe(false));
  });

  it('shows error messages and marks radio groups as touched when submitting an invalid form', () => {
    createComponent();

    expect(component.modalForm.valid).toBe(false);
    expect(radioErrorText()).toEqual([ '', '' ]);

    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(component.modalForm.controls['priority'].touched).toBe(true);
    expect(component.modalForm.controls['type'].touched).toBe(true);
    expect(component.modalForm.controls['message'].touched).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    expect(radioErrorText()).toEqual([ 'This field is required', 'This field is required' ]);
  });

  it('scrolls the first invalid field into view when submitting an invalid form', () => {
    createComponent();

    const firstInvalidField = fixture.nativeElement.querySelector('mat-radio-group');
    const scrollSpy = vi.fn();
    firstInvalidField.scrollIntoView = scrollSpy;

    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', null);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});
