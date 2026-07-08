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
    expect(component.steps[0].status).toBe('not started');
    expect(component.steps[1].status).toBe('not started');
    expect(component.steps[2].status).toBe('completed');

    const debugElements = fixture.debugElement.queryAll(By.css('div'));

    expect(debugElements.length).toBe(3);
    expect(debugElements[0].nativeElement.classList.contains('completed')).toBe(false);
    expect(debugElements[1].nativeElement.classList.contains('completed')).toBe(false);
    expect(debugElements[2].nativeElement.classList.contains('completed')).toBe(true);

    expect(debugElements[0].nativeElement.classList.contains('not-started')).toBe(true);
    expect(debugElements[1].nativeElement.classList.contains('not-started')).toBe(true);
  });

  it('should handle pending status correctly', () => {
    component.course = {
      steps: [
        { stepTitle: 'Step 1' }
      ]
    };
    component.courseProgress = [
      { stepNum: 1, passed: false }
    ];

    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.steps[0].status).toBe('pending');
    const debugElements = fixture.debugElement.queryAll(By.css('div'));
    expect(debugElements[0].nativeElement.classList.contains('completed')).toBe(false);
    expect(debugElements[0].nativeElement.classList.contains('not-started')).toBe(false);
  });
});
