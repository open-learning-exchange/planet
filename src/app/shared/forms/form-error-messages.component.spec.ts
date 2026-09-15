import { FormControl, Validators } from '@angular/forms';

import { FormErrorMessagesComponent } from './form-error-messages.component';

describe('FormErrorMessagesComponent', () => {
  let component: FormErrorMessagesComponent;

  beforeEach(() => {
    component = new FormErrorMessagesComponent();
  });

  it('safely initializes when control is undefined', () => {
    expect(() => component.ngOnInit()).not.toThrow();
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

  it('supports the formControl alias input', () => {
    const control = new FormControl('', Validators.required);
    component.formControl = control;

    expect(component.control).toBe(control);
    expect(component.error).toBe('required');
  });

  it('extracts min / max error limits and datepicker values', () => {
    const minControl = new FormControl(2, Validators.min(5));
    component.control = minControl;
    expect(component.error).toBe('min');
    expect(component.number).toBe(5);

    const dateControl = new FormControl('', () => ({ matDatepickerMin: { min: 1700000000000 } }));
    component.control = dateControl;
    expect(component.error).toBe('matDatepickerMin');
    expect(component.date).toEqual(new Date(1700000000000));
  });
});
