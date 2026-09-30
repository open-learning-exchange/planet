import { FormControl, FormGroupDirective, Validators } from '@angular/forms';

import { FormErrorMessagesComponent } from './form-error-messages.component';

describe('FormErrorMessagesComponent', () => {
  let component: FormErrorMessagesComponent;
  let parentFormGroup: { submitted: boolean };

  beforeEach(() => {
    parentFormGroup = { submitted: false };
    component = new FormErrorMessagesComponent(null, parentFormGroup as FormGroupDirective);
  });

  it('stays quiet when no control is bound', () => {
    component.control = undefined;
    expect(component.error).toBe('');
    expect(component.shouldShowError()).toBe(false);
  });

  it('updates error on control assignment and status changes', () => {
    const control = new FormControl('', Validators.required);
    component.control = control;

    expect(component.error).toBe('required');
    expect(component.shouldShowError()).toBe(false);

    control.markAsTouched();
    expect(component.shouldShowError()).toBe(true);

    control.setValue('valid text');
    expect(component.error).toBe('');
    expect(component.shouldShowError()).toBe(false);
  });

  it('shows the error once the surrounding form is submitted', () => {
    const control = new FormControl('', Validators.required);
    component.control = control;
    expect(component.shouldShowError()).toBe(false);

    parentFormGroup.submitted = true;
    expect(component.shouldShowError()).toBe(true);
  });

  it('carries an error limit only as long as that error lasts', () => {
    const minControl = new FormControl(2, Validators.min(5));
    component.control = minControl;
    expect(component.error).toBe('min');
    expect(component.number).toBe(5);

    const dateControl = new FormControl('', () => ({ matDatepickerMin: { min: 1700000000000 } }));
    component.control = dateControl;
    expect(component.error).toBe('matDatepickerMin');
    expect(component.date).toEqual(new Date(1700000000000));
    expect(component.number).toBeUndefined();

    const intControl = new FormControl('abc', () => ({ invalidInt: true }));
    component.control = intControl;
    expect(component.error).toBe('invalidInt');
    expect(component.date).toBeUndefined();
  });
});
