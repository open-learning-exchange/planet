import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoursesProgressBarComponent } from './courses-progress-bar.component';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

describe('CoursesProgressBarComponent', () => {
  let component: CoursesProgressBarComponent;
  let fixture: ComponentFixture<CoursesProgressBarComponent>;
  let mockRouter: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MatTooltipModule, CoursesProgressBarComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoursesProgressBarComponent);
    component = fixture.componentInstance;
  });

  it('should correctly identify completed steps when they are out of order', () => {
    component.course = {
      steps: [
        { stepTitle: 'Step 1' },
        { stepTitle: 'Step 2' },
        { stepTitle: 'Step 3' }
      ]
    };
    component.courseProgress = [
      { stepNum: 3, passed: true }
    ];

    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.steps.length).toBe(3);
    expect(component.steps[2].status).toBe('completed');

    const debugElements = fixture.debugElement.queryAll(By.css('div'));
    expect(debugElements[2].nativeElement.classList.contains('completed')).toBe(true);
  });

  it('should handle reordering of steps with stable identifiers (stepId)', () => {
    const stepA = { id: 'id1', stepTitle: 'Step A' };
    const stepB = { id: 'id2', stepTitle: 'Step B' };

    component.courseProgress = [
      { stepNum: 2, stepId: 'id2', passed: true }
    ];

    // Case 1: Original Order [A, B]
    component.course = { steps: [ stepA, stepB ] };
    component.ngOnChanges();
    fixture.detectChanges();
    expect(component.steps[0].status).toBe('not started');
    expect(component.steps[1].status).toBe('completed');

    // Case 2: Reordered [B, A]
    component.course = { steps: [ stepB, stepA ] };
    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.steps[0].stepTitle).toBe('Step B');
    expect(component.steps[0].status).toBe('completed');
    expect(component.steps[1].status).toBe('not started');
  });

  it('should handle reordering of steps with stable identifiers (examId)', () => {
    const stepA = { stepTitle: 'Step A', exam: { _id: 'exam1' } };
    const stepB = { stepTitle: 'Step B', exam: { _id: 'exam2' } };

    component.courseProgress = [
      { stepNum: 2, examId: 'exam2', passed: true }
    ];

    // Case 1: Original Order [A, B]
    component.course = { steps: [ stepA, stepB ] };
    component.ngOnChanges();
    fixture.detectChanges();
    expect(component.steps[1].status).toBe('completed');

    // Case 2: Reordered [B, A]
    component.course = { steps: [ stepB, stepA ] };
    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.steps[0].stepTitle).toBe('Step B');
    expect(component.steps[0].status).toBe('completed');
    expect(component.steps[1].status).toBe('not started');
  });

  it('should fallback to stepNum for legacy progress docs without stable IDs', () => {
    component.course = {
      steps: [
        { id: 'id1', stepTitle: 'Step 1' },
        { id: 'id2', stepTitle: 'Step 2' }
      ]
    };
    component.courseProgress = [
      { stepNum: 2, passed: true } // No stepId or examId
    ];

    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.steps[1].status).toBe('completed');
  });
});
