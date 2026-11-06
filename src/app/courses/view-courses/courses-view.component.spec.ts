import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CoursesViewComponent } from './courses-view.component';

describe('CoursesViewComponent', () => {
  let routerMock: any;
  let component: CoursesViewComponent;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    component = new CoursesViewComponent(
      routerMock as any, { get: () => ({ name: 'u', shelf: { courseIds: [] } }) } as any,
      { snapshot: { data: {} } } as any, {} as any, {} as any,
      { configuration: {} } as any, { deviceType: signal(undefined) } as any, {} as any, {} as any, {} as any
    );
  });

  it('locks steps and navigates to unlocked step when preceding step passing is required', () => {
    component.courseDetail = {
      steps: [
        { stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'S2' }
      ]
    };
    component.progress = [ { stepNum: 1, passed: false }, { stepNum: 2, passed: true } ];

    expect(component.isStepLocked(0)).toBe(false);
    expect(component.isStepLocked(1)).toBe(true);

    component.viewStep();
    expect(routerMock.navigate).toHaveBeenCalledWith([ './step/1' ], expect.any(Object));
  });

  it('exempts course managers from step locks', () => {
    component.canManage = true;
    component.courseDetail = {
      steps: [
        { stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'S2' }
      ]
    };
    component.progress = [ { stepNum: 1, passed: false } ];

    expect(component.isStepLocked(1)).toBe(false);
  });

  it('prioritizes passed progress record when multiple exist', () => {
    component.courseDetail = {
      steps: [
        { stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'S2' }
      ]
    };
    component.progress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ];

    expect(component.isStepLocked(1)).toBe(false);
  });

  it.each([ true, false ])('allows the next test after a stored pass with zero attempts (passingRequired: %s)', (passingRequired) => {
    component.courseDetail = {
      steps: [
        { exam: { questions: [ {} ] }, passingRequired, submission: { answers: [] }, attempts: 0 },
        { stepTitle: 'S2' }
      ]
    };
    component.progress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ];

    component.setStepButtonStatus(component.courseDetail.steps[1], 1);

    expect(component.isStepLocked(1)).toBe(false);
    expect(component.courseDetail.steps[1].isPreviousTestTaken).toBe(true);
  });

  it('does not count a visited content step as a taken test', () => {
    component.courseDetail = {
      steps: [
        { exam: { questions: [ {} ] }, submission: { answers: [] }, attempts: 0 },
        { stepTitle: 'S2' },
        { stepTitle: 'S3', exam: { questions: [ {} ] }, submission: { answers: [] }, attempts: 0 }
      ]
    };
    component.progress = [ { stepNum: 2, passed: true } ];

    component.setStepButtonStatus(component.courseDetail.steps[2], 2);

    expect(component.courseDetail.steps[2].isPreviousTestTaken).toBeFalsy();
  });
});
