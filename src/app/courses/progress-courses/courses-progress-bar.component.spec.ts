import { vi } from 'vitest';
import { CoursesProgressBarComponent } from './courses-progress-bar.component';

describe('CoursesProgressBarComponent', () => {
  let routerMock: any;
  let component: CoursesProgressBarComponent;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    component = new CoursesProgressBarComponent(routerMock as any);
    component.course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
  });

  it('locks steps after an unpassed required exam and prevents routing to them', () => {
    component.courseProgress = [ { stepNum: 1, passed: false }, { stepNum: 2, passed: true } ];
    component.ngOnChanges();

    expect(component.steps[1].tooltip).toBe('Step 2 (Locked)');
    component.routing(component.steps[1], 1);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('prioritizes passed progress doc when multiple progress records exist for a step', () => {
    component.courseProgress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true }, { stepNum: 2, passed: true } ];
    component.ngOnChanges();

    expect(component.steps[0].status).toBe('completed');
    expect(component.steps[0].tooltip).toBe('Step 1 (Passed)');
    expect(component.steps[1].tooltip).toBe('Step 2 (Completed)');
  });

  it('exempts course managers from step locks and allows routing', () => {
    component.canManage = true;
    component.courseProgress = [ { stepNum: 1, passed: false } ];
    component.ngOnChanges();

    expect(component.steps[1].clickable).toBe(true);
    component.routing(component.steps[1], 1);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses/view', 'c1', 'step', 2 ]);
  });
});
