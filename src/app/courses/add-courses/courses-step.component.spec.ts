import { FormBuilder } from '@angular/forms';
import { CoursesStepComponent } from './courses-step.component';

describe('CoursesStepComponent', () => {
  it('updates passingRequired on step select and form change', () => {
    const fb = new FormBuilder().nonNullable;
    const component = new CoursesStepComponent({} as any, fb, {} as any, {} as any, {} as any);
    component.steps = [ { stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true } ];
    component.stepClick(0);
    expect(component.stepForm.controls.passingRequired.value).toBe(true);

    component.stepForm.controls.passingRequired.setValue(false);
    expect(component.steps[0].passingRequired).toBe(false);
  });
});
