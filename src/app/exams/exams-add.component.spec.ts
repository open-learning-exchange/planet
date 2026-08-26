import { FormBuilder, FormGroup } from '@angular/forms';
import { vi } from 'vitest';

import { ExamsAddComponent } from './exams-add.component';
import { QuestionFormGroup } from './exams.service';

describe('ExamsAddComponent', () => {
  const createComponent = () => new ExamsAddComponent(
    { url: '/manager/surveys' } as any,
    {
      parent: null,
      snapshot: {
        paramMap: { get: vi.fn().mockReturnValue('survey') },
        url: [ { path: 'add' } ]
      }
    } as any,
    new FormBuilder().nonNullable,
    {} as any,
    {} as any,
    {} as any,
    { course: {} } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  it('requires at least one question before the form can be saved', () => {
    const component = createComponent();

    expect(component.questions.hasError('required')).toBe(true);

    component.questions.push(new FormGroup({}) as unknown as QuestionFormGroup);
    expect(component.questions.valid).toBe(true);

    component.questions.removeAt(0);
    expect(component.questions.hasError('required')).toBe(true);
  });
});
