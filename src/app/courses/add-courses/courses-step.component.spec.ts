import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CoursesStepComponent } from './courses-step.component';

describe('CoursesStepComponent', () => {
  const createComponent = (step: any) => {
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    const component = new CoursesStepComponent({} as any, new FormBuilder().nonNullable, dialog as any, {} as any, {} as any);
    component.steps = [ step ];
    component.stepClick(0);
    const stepsChange = vi.spyOn(component.stepsChange, 'emit');
    return { component, dialog, stepsChange };
  };

  it('updates passingRequired on step select and form change', () => {
    const { component } = createComponent({ stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true });
    expect(component.stepForm.controls.passingRequired.value).toBe(true);

    component.stepForm.controls.passingRequired.setValue(false);
    expect(component.steps[0].passingRequired).toBe(false);
  });

  it('removes a test with its pass requirement and keeps the survey', () => {
    const { component, dialog, stepsChange } = createComponent({
      stepTitle: 'S1', exam: { name: 'Quiz', questions: [] }, survey: { name: 'Feedback' }, passingRequired: true
    });

    component.removeExam('exam');

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({ displayName: 'Quiz', extraMessage: expect.stringContaining('next step') })
    });
    expect(component.steps[0]).not.toHaveProperty('exam');
    expect(component.steps[0]).toEqual(expect.objectContaining({ survey: { name: 'Feedback' }, passingRequired: false }));
    expect(component.stepForm.controls.passingRequired.value).toBe(false);
    expect(stepsChange).toHaveBeenCalledWith(component.steps);
  });

  it('removes a survey without changing the test\'s pass requirement', () => {
    const { component, dialog } = createComponent({
      stepTitle: 'S1', exam: { name: 'Quiz', questions: [ {} ] }, survey: { name: 'Feedback' }, passingRequired: true
    });

    component.removeExam('survey');

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
      data: expect.objectContaining({ displayName: 'Feedback', extraMessage: expect.not.stringContaining('next step') })
    });
    expect(component.steps[0]).not.toHaveProperty('survey');
    expect(component.steps[0]).toEqual(expect.objectContaining({ exam: { name: 'Quiz', questions: [ {} ] }, passingRequired: true }));
    expect(component.stepForm.controls.passingRequired.value).toBe(true);
  });
});
