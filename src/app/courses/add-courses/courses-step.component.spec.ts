import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';

import { CoursesStepComponent } from './courses-step.component';
import { CoursesService } from '../courses.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';

describe('CoursesStepComponent', () => {
  let fixture: ComponentFixture<CoursesStepComponent>;
  let component: CoursesStepComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ CommonModule, ReactiveFormsModule ],
      declarations: [ CoursesStepComponent ],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MatDialog, useValue: { open: () => ({ close: () => {} }) } },
        { provide: CoursesService, useValue: { stepIndex: 0 } },
        { provide: DialogsLoadingService, useValue: { stop: jasmine.createSpy('stop') } }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoursesStepComponent);
    component = fixture.componentInstance;
    component.steps = [ { resources: [ { _id: '1' }, { _id: '2' } ] } ];
    component.activeStepIndex = 0;
    component.activeStep = component.steps[0];
  });

  it('should emit updated steps when removing a resource', () => {
    const emittedSteps: any[][] = [];
    component.stepsChange.subscribe(steps => emittedSteps.push(steps));

    component.removeResource(0);

    expect(component.steps[0].resources.length).toBe(1);
    expect(emittedSteps.length).toBe(1);
    expect(emittedSteps[0][0].resources[0]._id).toBe('2');
  });
});
