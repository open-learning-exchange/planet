import { vi } from 'vitest';
import { of } from 'rxjs';
import { CoursesViewComponent } from './courses-view.component';

describe('CoursesViewComponent', () => {
  let routerMock: any;
  let component: CoursesViewComponent;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    component = new CoursesViewComponent(
      routerMock as any, { get: () => ({ name: 'u', shelf: { courseIds: [] } }) } as any,
      { snapshot: { data: {} } } as any, {} as any, {} as any,
      { configuration: {} } as any, { watchDeviceType: () => of('desktop') } as any, {} as any
    );
  });

  it('locks steps and navigates to unlocked step when preceding step passing is required', () => {
    component.courseDetail = {
      steps: [
        { stepTitle: 'S1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'S2' }
      ]
    };
    component.progress = [ { stepNum: 1, passed: false } ];

    expect(component.isStepLocked(0)).toBe(false);
    expect(component.isStepLocked(1)).toBe(true);

    component.viewStep();
    expect(routerMock.navigate).toHaveBeenCalledWith([ './step/1' ], expect.any(Object));
  });

  it('bounds targetStep in viewStep by latestReached and does not jump to end of course', () => {
    component.courseDetail = {
      steps: [
        { stepTitle: 'S1' },
        { stepTitle: 'S2' },
        { stepTitle: 'S3' },
        { stepTitle: 'S4' }
      ]
    };
    component.progress = [ { stepNum: 2 } ];

    component.viewStep();
    expect(routerMock.navigate).toHaveBeenCalledWith([ './step/2' ], expect.any(Object));
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
});
