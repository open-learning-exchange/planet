import { vi } from 'vitest';
import { CoursesProgressBarComponent } from './courses-progress-bar.component';

describe('CoursesProgressBarComponent', () => {
  it('identifies locked steps and prevents routing when previous step passing is required', () => {
    const routerMock = { navigate: vi.fn() };
    const component = new CoursesProgressBarComponent(routerMock as any);
    component.course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
    component.courseProgress = [ { stepNum: 1, passed: false } ];

    expect(component.isStepLocked(0)).toBe(false);
    expect(component.isStepLocked(1)).toBe(true);
    expect(component.stepTooltip({ stepTitle: 'Step 2', status: 'not started' }, 1)).toBe('Step 2 (Locked)');
    component.routing('pending', 1);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('prioritizes passed progress doc when multiple progress records exist for a step', () => {
    const routerMock = { navigate: vi.fn() };
    const component = new CoursesProgressBarComponent(routerMock as any);
    component.course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
    component.courseProgress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ];
    expect(component.isStepLocked(1)).toBe(false);

    component.ngOnChanges();
    expect(component.steps[0].status).toBe('completed');
  });

  it('exempts course managers from step locks and allows routing', () => {
    const routerMock = { navigate: vi.fn() };
    const component = new CoursesProgressBarComponent(routerMock as any);
    component.canManage = true;
    component.course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
    component.courseProgress = [ { stepNum: 1, passed: false } ];
    expect(component.isStepLocked(1)).toBe(false);

    component.routing('not started', 1);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses/view', 'c1', 'step', 2 ]);
  });
});
